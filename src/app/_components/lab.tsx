"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAtom } from 'jotai'
import { equipmentAtom, isBookingAtom } from '@/lib/atoms'
import { api } from '@/trpc/react'
import useLab from '@/hooks/use-lab'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@clerk/nextjs'
import CalendarPicker from './calendarPicker'
import { useTheme } from 'next-themes'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MinusIcon, PencilIcon, PlusIcon, X, Settings, Trash2, Check } from 'lucide-react'
import SeatGrid, { type LabConfig, parseLabConfig } from './SeatGrid'
import SeatConfigSlider from './SeatConfigSlider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


const Lab = ({ isPhysics, isTeacher }: { isPhysics: boolean, isTeacher: boolean }) => {
    const [booking, setBooking] = useAtom(isBookingAtom)
    const [equipment, setEquipment] = useAtom(equipmentAtom)
    const [displayedLabEquipment, setDisplayedLabEquipment] = useState<{ id: string, name: string, total: number, unitType: "UNIT" | "ML" }[]>([])
    const [editedLabEquipment, setEditedLabEquipment] = useState<{ id: string, name: string, total: number, unitType: "UNIT" | "ML" }[]>([])
    const [sessionEquipmentDraft, setSessionEquipmentDraft] = useState<{ name: string, id: string, total: number, available: number, unitType: "UNIT" | "ML" }[]>([])
    const [bookingEquipmentDraft, setBookingEquipmentDraft] = useState<{ name: string, id: string, total: number, available: number, unitType: "UNIT" | "ML" }[]>([])


    const [templateVisible, setTemplateVisible] = useState(false)
    const [templateName, setTemplateName] = useState("")
    const [templateTotal, setTemplateTotal] = useState(1)
    const [templateUnitType, setTemplateUnitType] = useState<"UNIT" | "ML">("UNIT")

    // Dynamic Seating State
    const [configVisible, setConfigVisible] = useState(false)
    const [notes, setNotes] = useState("")
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
    const [pendingSeat, setPendingSeat] = useState<string | null>(null)
    // Removed isEditing - unification of view/edit modes

    // Smart Save State
    const [initialNotes, setInitialNotes] = useState("")
    const [initialBookingEquipment, setInitialBookingEquipment] = useState<{ id: string, amount: number }[]>([])
    const [currentTime, setCurrentTime] = useState(Date.now())
    const prevSessionRef = useRef<string | null>(null)
    const bookingDirtyRef = useRef(false)

    const utils = api.useUtils()

    const { userId } = useAuth()
    const { theme } = useTheme()
    const labData = useLab({ lab: isPhysics ? "Physics" : "Biology" })

    const bookSeatMutation = api.account.bookSeatWithEquipment.useMutation()
    const unbookSeatMutation = api.account.unbookSeat.useMutation()
    const switchSeatMutation = api.account.switchSeat.useMutation()
    const addLabEquipmentMutation = api.account.addLabEquipment.useMutation()
    const deleteLabEquipmentMutation = api.account.deleteLabEquipment.useMutation()
    const updateLabEquipmentMutation = api.account.updateLabEquipment.useMutation()
    const updateLabConfigMutation = api.account.updateLabConfig.useMutation()
    const updateSessionEquipmentMutation = api.account.updateSessionEquipment.useMutation()
    const updateBookingDetailsMutation = api.account.updateBookingDetails.useMutation()

    const config = useMemo(() => parseLabConfig(labData?.defaultRowConfig), [labData?.defaultRowConfig])
    const activeSessionId = booking ?? equipment
    const hasConfig = Boolean(labData?.defaultRowConfig)

    const { data: seats } = api.account.getSeatIds.useQuery({
        labId: labData?.id!
    }, {
        enabled: !!labData?.id
    })
    const seatIds = seats ?? []

    const unitLabel = (unitType: "UNIT" | "ML") => (unitType === "ML" ? "mL" : "qty")

    const effectiveConfig = useMemo<LabConfig>(() => {
        if (hasConfig) return config
        if (!seatIds.length) return config

        const maxByRow = new Map<string, number>()
        seatIds.forEach(seat => {
            if (seat.name.toLowerCase() === "edge") return
            const match = seat.name.match(/^([A-Za-z]+)(\d+)$/)
            if (!match) return
            const rowName = match[1]?.toUpperCase()
            const col = Number(match[2])
            if (!rowName || Number.isNaN(col)) return
            const existing = maxByRow.get(rowName) ?? 0
            if (col > existing) maxByRow.set(rowName, col)
        })

        const rows = Array.from(maxByRow.entries())
            .map(([name, seats]) => ({ name, seats }))
            .sort((a, b) => a.name.localeCompare(b.name))

        return {
            rows: rows.length > 0 ? rows : config.rows,
            edgeSeat: config.edgeSeat,
        }
    }, [config, seatIds, hasConfig])

    const { data: occupiedSeats, refetch: refetchSeats } = api.account.getOccupiedSeats.useQuery({
        labId: labData?.id!,
        sessionId: activeSessionId!
    }, {
        enabled: activeSessionId !== null && !!labData?.id,
    })

    const myBooking = useMemo(() => occupiedSeats?.find(s => s.userId === userId), [occupiedSeats, userId])

    const { data: sessionData } = api.account.getSessionById.useQuery({ sessionId: booking! }, {
        enabled: !!booking
    })

    // Reactive Lockout Timer
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    const isLate = useMemo(() => {
        if (!sessionData?.startAt) return false;
        const start = new Date(sessionData.startAt);
        const lockTime = new Date(start.getTime() - 15 * 60 * 1000);
        return currentTime > lockTime.getTime();
    }, [sessionData, currentTime]);

    const { data: labEquipment, refetch: refetchLabEquipment } = api.account.getLabEquipment.useQuery({
        labId: labData?.id!
    }, {
        enabled: !!labData?.id
    })

    const { data: sessionEquipment, refetch: refetchSessionEquipment } = api.account.getSessionEquipment.useQuery({
        sessionId: activeSessionId!
    }, {
        enabled: activeSessionId !== null
    })

    const bookSeat = async (name: string) => {
        if (!booking || !labData) return false

        const selectedEquipment = bookingEquipmentDraft
            .filter(e => e.available > 0)
            .map(e => ({
                equipmentId: e.id,
                amount: e.available
            }))

        try {
            await bookSeatMutation.mutateAsync({
                sessionId: booking,
                name,
                labId: labData.id,
                equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
                notes: notes?.trim() ? notes.trim() : undefined
            })
            toast.success(`Seat ${name} successfully booked`)
            refetchSeats()
            utils.account.getMyBookings.invalidate()
            setBooking(null)
            return true
        } catch (error: any) {
            const message = error?.message?.includes("Unique constraint")
                ? "You already have a booking for this session. Cancel it before booking another seat."
                : error?.message ?? "Unable to book seat";
            toast.error(message)
            return false
        }
    }

    const unbookSeat = (name: string) => {
        if (!booking || !labData) return

        unbookSeatMutation.mutate({
            sessionId: booking,
            name,
            labId: labData.id,
            isTeacher
        }, {
            onSuccess: () => {
                toast.success(`Seat ${name} successfully unbooked`)
                // Do NOT clear booking (session ID) here, otherwise we exit the session view!
                refetchSeats()
                utils.account.getMyBookings.invalidate()
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    const switchSeat = async (name: string) => {
        if (!booking || !labData || !myBooking) return false

        try {
            await switchSeatMutation.mutateAsync({
                sessionId: booking,
                labId: labData.id,
                newSeatName: name,
            })
            toast.success(`Switched to seat ${name}`)
            refetchSeats()
            utils.account.getMyBookings.invalidate()
            return true
        } catch (error: any) {
            toast.error(error?.message ?? "Unable to switch seats")
            return false
        }
    }

    const addLabEquipment = () => {
        if (templateName === "") {
            toast.error("Please enter a name for the equipment")
            return
        }

        addLabEquipmentMutation.mutate({
            name: templateName,
            labId: labData?.id!,
            total: templateTotal,
            unitType: templateUnitType
        }, {
            onSuccess: () => {
                toast.success(templateName + " successfully added")
                setTemplateVisible(false)
                setTemplateName("")
                setTemplateTotal(1)
                setTemplateUnitType("UNIT")
                refetchLabEquipment()
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    const deleteLabEquipment = (id: string) => {
        deleteLabEquipmentMutation.mutate({
            id
        }, {
            onSuccess: () => {
                toast.success("Equipment successfully deleted")
                refetchLabEquipment()
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    const updateLabEquipment = (id: string) => {
        const eq = editedLabEquipment.find(e => e.id === id)
        if (!eq) return

        updateLabEquipmentMutation.mutate({
            id: eq.id,
            name: eq.name,
            total: eq.total,
            unitType: eq.unitType
        }, {
            onSuccess: () => {
                toast.success("Equipment successfully updated")
                refetchLabEquipment()
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    const updateSessionEquipment = () => {
        const deletedEq = sessionEquipment?.filter(eq => !sessionEquipmentDraft.some(e => e.id === eq.equipmentId)) ?? []

        const addedEq = sessionEquipmentDraft.filter(eq => !sessionEquipment?.some(e => e.equipmentId === eq.id))

        const updatedEq = sessionEquipmentDraft.filter(
            eq => {
                const e = sessionEquipment?.find(q => q.equipmentId === eq.id)
                return e && e.available !== eq.available
            }
        )

        updateSessionEquipmentMutation.mutate({
            sessionId: equipment!,
            deletedEq: deletedEq.map(e => {
                return {
                    id: e.equipmentId,
                    available: e.available
                }
            }),
            addedEq: addedEq.map(e => {
                return {
                    id: e.id,
                    available: e.available
                }
            }),
            updatedEq: updatedEq.map(e => {
                return {
                    id: e.id,
                    available: e.available
                }
            }),
        }, {
            onSuccess: () => {
                toast.success("Session equipment successfully updated")
                refetchSessionEquipment()
                utils.account.getSessionEquipment.invalidate({ sessionId: equipment! })
                setEquipment(null)
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    const addAllSessionEquipment = () => {
        if (!labEquipment || labEquipment.length === 0) return
        setSessionEquipmentDraft(labEquipment.map(eq => ({ ...eq, available: eq.total })))
    }

    useEffect(() => {
        if (!activeSessionId) return
        refetchSeats()
    }, [activeSessionId, refetchSeats])

    useEffect(() => {
        return () => {
            setBooking(null)
            setEquipment(null)
        }
    }, [setBooking, setEquipment])

    useEffect(() => {
        if (!activeSessionId) return
        refetchSessionEquipment()
    }, [activeSessionId, refetchSessionEquipment])

    useEffect(() => {
        if (!labEquipment) return
        setDisplayedLabEquipment(labEquipment.map(e => ({ id: e.id, name: e.name, total: e.total, unitType: e.unitType })))
    }, [labEquipment])

    // State Sync Effect & Initial State (booking details only)
    const bookingInitRef = useRef<string | null>(null)

    useEffect(() => {
        if (!booking) return

        if (!myBooking) {
            if (bookingInitRef.current) {
                setNotes("")
                setBookingEquipmentDraft([])
                setInitialNotes("")
                setInitialBookingEquipment([])
                bookingInitRef.current = null
            }
            return
        }

        const serverNotes = (myBooking as any).notes || ""
        const bookings = (myBooking as any).equipmentBookings || []

        if (bookings.length > 0 && (!labEquipment || labEquipment.length === 0)) {
            return
        }

        const serverEquipment = bookings.map((eb: any) => {
            const info = labEquipment?.find(e => e.id === eb.equipmentId)
            return info ? { ...info, available: eb.amount } : null
        }).filter(Boolean) as typeof bookingEquipmentDraft

        const serverInitial = bookings.map((eb: any) => ({ id: eb.equipmentId, amount: eb.amount }))
        const bookingId = (myBooking as any).id as string

        if (bookingInitRef.current !== bookingId) {
            setInitialNotes(serverNotes)
            setNotes(serverNotes)
            setInitialBookingEquipment(serverInitial)
            setBookingEquipmentDraft(serverEquipment)
            bookingInitRef.current = bookingId
            return
        }

        if (!bookingDirtyRef.current) {
            setNotes(serverNotes)
            setBookingEquipmentDraft(serverEquipment)
        }
        setInitialNotes(serverNotes)
        setInitialBookingEquipment(serverInitial)
    }, [booking, myBooking?.id, labEquipment])

    // Derived State for Displayed Equipment (Available for selection)
    const displayedSessionEquipment = useMemo(() => {
        if (!booking || !sessionEquipment) return []

        return sessionEquipment.map(eq => {
            const limit = eq.available
            const totalReserved = eq.reserved
            const myInitial = initialBookingEquipment.find(ie => ie.id === eq.equipmentId)?.amount || 0
            const myCurrent = bookingEquipmentDraft.find(ae => ae.id === eq.equipmentId)?.available || 0

            const othersReserved = Math.max(totalReserved - myInitial, 0)
            const remaining = Math.max(limit - othersReserved - myCurrent, 0)

            return {
                name: eq.equipment.name,
                id: eq.equipmentId,
                total: eq.equipment.total,
                available: remaining,
                unitType: eq.equipment.unitType
            }
        })
    }, [booking, sessionEquipment, bookingEquipmentDraft, initialBookingEquipment])

    // Teacher Mode Initialization
    const sessionDraftSessionRef = useRef<string | null>(null)

    useEffect(() => {
        if (!equipment) {
            sessionDraftSessionRef.current = null
            return
        }
        if (!sessionEquipment) return

        const mapped = sessionEquipment.map(eq => ({
            name: eq.equipment.name,
            id: eq.equipmentId,
            total: eq.equipment.total,
            available: eq.available,
            unitType: eq.equipment.unitType
        }))

        if (sessionDraftSessionRef.current !== equipment) {
            setSessionEquipmentDraft(mapped)
            sessionDraftSessionRef.current = equipment
        }
    }, [equipment, sessionEquipment])

    useEffect(() => {
        if (activeSessionId !== prevSessionRef.current) {
            setSelectedSeat(null)
            setPendingSeat(null)
            setTemplateVisible(false)
            setNotes("")
            // setBookingEquipmentDraft([]) - Managed by init effect
            // setSessionEquipmentDraft([]) - Managed by init effect

            setInitialNotes("")
            setInitialBookingEquipment([])
            prevSessionRef.current = activeSessionId ?? null
        }
    }, [activeSessionId])

    const handleSaveChanges = () => {
        // Find my booking ID
        if (!myBooking) return;

        updateBookingDetailsMutation.mutate({
            bookingId: (myBooking as any).id,
            notes: notes?.trim() ? notes.trim() : undefined,
            equipment: bookingEquipmentDraft
                .filter(e => e.available > 0)
                .map(e => ({ equipmentId: e.id, amount: e.available }))
        }, {
            onSuccess: () => {
                toast.success("Booking details updated");
                refetchSeats();
                utils.account.getMyBookings.invalidate();
                setInitialNotes(notes);
                setInitialBookingEquipment(bookingEquipmentDraft.map(e => ({ id: e.id, amount: e.available })));
                setBooking(null);
            },
            onError: (err) => toast.error(err.message)
        });
    }

    const isDirty = useMemo(() => {
        if (notes !== initialNotes) return true;

        if (bookingEquipmentDraft.length !== initialBookingEquipment.length) return true;

        for (const item of bookingEquipmentDraft) {
            const init = initialBookingEquipment.find(eq => eq.id === item.id);
            if (!init || init.amount !== item.available) return true;
        }
        return false;
    }, [notes, initialNotes, bookingEquipmentDraft, initialBookingEquipment]);

    useEffect(() => {
        bookingDirtyRef.current = isDirty
    }, [isDirty]);

    const hasSessionEquipmentChanges = useMemo(() => {
        if (!equipment || !sessionEquipment) return false
        const currentMap = new Map(sessionEquipment.map(eq => [eq.equipmentId, eq.available]))
        for (const eq of sessionEquipmentDraft) {
            const existing = currentMap.get(eq.id)
            if (existing === undefined || existing !== eq.available) return true
        }
        for (const existing of sessionEquipment) {
            if (!sessionEquipmentDraft.some(eq => eq.id === existing.equipmentId)) return true
        }
        return false
    }, [equipment, sessionEquipment, sessionEquipmentDraft])

    const reservedById = useMemo(() => {
        return new Map((sessionEquipment ?? []).map(eq => [eq.equipmentId, eq.reserved]))
    }, [sessionEquipment])

    const selectionActive = activeSessionId !== null
    const showEquipmentPanel = isTeacher || booking !== null || equipment !== null
    const seatControlsEnabled = booking !== null && equipment === null && !configVisible
    const isEquipmentFocus = booking !== null || equipment !== null || templateVisible || pendingSeat !== null
    const labPanelClass = showEquipmentPanel
        ? (isEquipmentFocus ? "basis-[56%]" : "basis-[60%]")
        : "basis-full"
    const equipmentPanelClass = isEquipmentFocus ? "basis-[44%]" : "basis-[40%]"


    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex-none px-4 pt-4 pb-2">
                <h1 className='flex items-center justify-center mb-4 text-3xl font-semibold'>{isPhysics ? 'Physics/Chemistry Lab' : 'Biology Lab'}</h1>
                <div className='flex w-full max-w-[1480px] gap-6 items-start transition-all duration-500 ease-spring mx-auto'>
                    <div className={`relative flex ${labPanelClass} flex-col items-center justify-start rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm transition-[flex-basis] duration-500 ease-in-out ${activeSessionId !== null ? "outline-blue border-transparent" : "border-border/60"}`}>
                        {isLate && !isTeacher && booking && (
                            <div className='absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium z-10 animate-in fade-in slide-in-from-top-4 flex items-center gap-2'>
                                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                                Bookings Locked
                            </div>
                        )}
                        <SeatGrid
                            config={effectiveConfig}
                            occupiedSeats={occupiedSeats?.map(s => ({
                                id: s.seatId,
                                name: s.name,
                                userId: s.userId,
                                status: s.status,
                                user: s.user
                            })) ?? []}
                            currentUserId={userId}
                            onSeatClick={(seatName, isOccupied, isUserSeat) => {
                                if (!seatControlsEnabled) {
                                    if (equipment) {
                                        toast.error("Switch to booking mode to manage seats")
                                    } else if (!booking) {
                                        toast.error("Select a session first to manage seats")
                                    }
                                    return
                                }
                                if (!booking && !isTeacher && !configVisible) {
                                    toast.error("Please select a session first")
                                    return
                                }
                                if (isLate && !isTeacher) {
                                    toast.error("Bookings are locked 15 minutes before the session starts.")
                                    return
                                }
                                if (isOccupied && !isUserSeat && !isTeacher) {
                                    toast.error("This seat is occupied")
                                    return
                                }
                                if (isOccupied) {
                                    setSelectedSeat(seatName)
                                } else {
                                    setPendingSeat(seatName)
                                }
                            }}
                            disabled={!seatControlsEnabled}
                            screenSide={labData?.name?.toLowerCase().includes("biology") ? "right" : "left"}
                            showLegend={booking !== null}
                            selectionActive={selectionActive}
                            showCapacity={booking !== null}
                        />

                        {isTeacher && (
                            <div className="absolute top-4 right-4 z-20">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => setConfigVisible(true)}
                                    title="Configure Layout"
                                    disabled={booking !== null || equipment !== null}
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <Dialog open={!!selectedSeat} onOpenChange={(open) => !open && setSelectedSeat(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {occupiedSeats?.some(s => s.name === selectedSeat && s.userId === userId) ? "Manage Booking"
                                            : occupiedSeats?.some(s => s.name === selectedSeat) ? "Manage Seat"
                                                : "Confirm Booking"}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <p className="text-center mb-4">
                                        {occupiedSeats?.some(s => s.name === selectedSeat && s.userId === userId)
                                            ? `Are you sure you want to unbook seat ${selectedSeat}?`
                                            : occupiedSeats?.some(s => s.name === selectedSeat)
                                                ? `Unbook seat ${selectedSeat} for ${occupiedSeats.find(s => s.name === selectedSeat)?.user.firstName}?`
                                                : `Do you want to book seat ${selectedSeat}?`}
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        {occupiedSeats?.some(s => s.name === selectedSeat) ? (
                                            <Button
                                                variant="destructive"
                                                onClick={() => {
                                                    if (selectedSeat) unbookSeat(selectedSeat)
                                                    setSelectedSeat(null)
                                                }}
                                            >
                                                Unbook Seat
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={async () => {
                                                    if (!selectedSeat) return
                                                    const success = await bookSeat(selectedSeat)
                                                    if (success) setSelectedSeat(null)
                                                }}
                                            >
                                                Confirm Booking
                                            </Button>
                                        )}
                                        <Button variant="secondary" onClick={() => setSelectedSeat(null)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={configVisible} onOpenChange={setConfigVisible}>
                            <DialogContent className="max-w-xl">
                                <DialogHeader>
                                    <DialogTitle className="sr-only">Configure seat layout</DialogTitle>
                                </DialogHeader>
                                <SeatConfigSlider
                                    initialConfig={config}
                                    screenSide={labData?.name?.toLowerCase().includes("biology") ? "right" : "left"}
                                    onSave={(newConfig) => {
                                        if (labData) {
                                            updateLabConfigMutation.mutate({
                                                labId: labData.id,
                                                config: JSON.stringify(newConfig)
                                            }, {
                                                onSuccess: () => {
                                                    toast.success("Configuration updated")
                                                    setConfigVisible(false)
                                                    utils.account.getLabId.invalidate()
                                                }
                                            })
                                        }
                                    }}
                                    onCancel={() => setConfigVisible(false)}
                                />
                            </DialogContent>
                        </Dialog>

                    </div>
                    {showEquipmentPanel &&
                        <div className={`flex ${equipmentPanelClass} flex-col border border-border/60 relative rounded-2xl bg-card/80 p-4 gap-4 shadow-sm transition-[flex-basis] duration-500 ease-in-out ${(booking !== null || equipment !== null) ? "outline-blue" : ""} max-h-[56vh]`}>
                            <div className={`flex items-center ${(booking === null && equipment === null) ? "justify-between" : "justify-center"}`}>
                                <div className={`text-foreground font-semibold text-xl pl-2 ${booking === null && equipment === null ? "" : "pt-2"}`}>
                                    {booking ? "Session Equipment" : equipment ? "Edit Session Equipment" : "Lab Equipment"}
                                </div>
                                {booking === null && equipment === null && isTeacher &&
                                    <Button
                                        variant={theme === "dark" ? "default" : "secondary"}
                                        onClick={() => setTemplateVisible(true)}
                                    >+ Add Equipment</Button>
                                }
                            </div>
                            <div className='flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1'>
                                {templateVisible && !booking && !equipment && (
                                    <div className='rounded-lg w-full border border-border/60 bg-muted/30 p-2 text-foreground'>
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <Input
                                                type="text"
                                                className='!bg-transparent h-8 w-fit max-w-[160px] border-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0'
                                                placeholder="Equipment Name"
                                                autoFocus
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                            />
                                            <Select value={templateUnitType} onValueChange={(value) => setTemplateUnitType(value as "UNIT" | "ML")}>
                                                <SelectTrigger className="h-8 w-24 text-xs">
                                                    <SelectValue placeholder="Unit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UNIT">Qty</SelectItem>
                                                    <SelectItem value="ML">mL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1 h-8">
                                                <button
                                                    type="button"
                                                    className={`px-1 text-xs ${templateTotal === 1 ? "opacity-50" : ""}`}
                                                    onClick={() => setTemplateTotal((q) => (q > 1 ? q - 1 : 1))}
                                                >
                                                    -
                                                </button>
                                                <Input
                                                    type='text'
                                                    className='!bg-transparent h-7 w-10 border-none text-center text-xs focus-visible:ring-0 focus-visible:ring-offset-0'
                                                    placeholder="Qty"
                                                    value={templateTotal}
                                                    onChange={(e) => setTemplateTotal(parseInt(e.target.value) > 1 ? parseInt(e.target.value) : 1)}
                                                />
                                                <button
                                                    type="button"
                                                    className='px-1 text-xs'
                                                    onClick={() => setTemplateTotal(q => q + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <Button
                                                className='ml-auto h-8'
                                                variant={theme === "dark" ? "default" : "secondary"}
                                                onClick={() => addLabEquipment()}
                                            >
                                                Add
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                    setTemplateVisible(false)
                                                    setTemplateName("")
                                                    setTemplateTotal(1)
                                                    setTemplateUnitType("UNIT")
                                                }}
                                            >
                                                <X className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {isTeacher && !booking && !equipment && (
                                    labEquipment ? labEquipment.map((item, index) => (
                                        <div className='rounded-lg w-full border border-border/60 bg-muted/30 p-2 text-foreground' key={item.id}>
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <Input
                                                    type="text"
                                                    id={item.id}
                                                    className='!bg-transparent h-8 w-fit max-w-[160px] border-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0'
                                                    placeholder="Equipment Name"
                                                    value={displayedLabEquipment[index]?.name ?? ""}
                                                    onChange={(e) => {
                                                        const newName = e.target.value
                                                        setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, name: newName } : eq))
                                                        setEditedLabEquipment(prev => {
                                                            const existing = prev.find(eq => eq.id === item.id)
                                                            if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, name: newName } : eq)
                                                            return [...prev, { id: item.id, name: newName, total: item.total, unitType: item.unitType }]
                                                        })
                                                    }}
                                                />
                                                <Select
                                                    value={displayedLabEquipment[index]?.unitType ?? item.unitType}
                                                    onValueChange={(value) => {
                                                        const newUnit = value as "UNIT" | "ML"
                                                        setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, unitType: newUnit } : eq))
                                                        setEditedLabEquipment(prev => {
                                                            const existing = prev.find(eq => eq.id === item.id)
                                                            if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, unitType: newUnit } : eq)
                                                            return [...prev, { id: item.id, name: item.name, total: item.total, unitType: newUnit }]
                                                        })
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 w-24 text-xs">
                                                        <SelectValue placeholder="Unit" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="UNIT">Qty</SelectItem>
                                                        <SelectItem value="ML">mL</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <div className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1 h-8">
                                                    <button
                                                        type="button"
                                                        className={`px-1 text-xs ${displayedLabEquipment[index]?.total === 1 ? "opacity-50" : ""}`}
                                                        onClick={() => {
                                                            if (!displayedLabEquipment[index]) return
                                                            const newTotal = Math.max(1, displayedLabEquipment[index].total - 1)
                                                            setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq))
                                                            setEditedLabEquipment(prev => {
                                                                const existing = prev.find(eq => eq.id === item.id)
                                                                if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq)
                                                                return [...prev, { id: item.id, name: item.name, total: newTotal, unitType: displayedLabEquipment[index]?.unitType ?? item.unitType }]
                                                            })
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                    <Input
                                                        type='text'
                                                        className='!bg-transparent h-7 w-10 border-none text-center text-xs focus-visible:ring-0 focus-visible:ring-offset-0'
                                                        placeholder="Qty"
                                                        value={displayedLabEquipment[index]?.total ?? ""}
                                                        onChange={(e) => {
                                                            let newTotal = parseInt(e.target.value)
                                                            if (e.target.value === "") newTotal = 1
                                                            if (newTotal < 1) return
                                                            setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq))
                                                            setEditedLabEquipment(prev => {
                                                                const existing = prev.find(eq => eq.id === item.id)
                                                                if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq)
                                                                return [...prev, { id: item.id, name: item.name, total: newTotal, unitType: displayedLabEquipment[index]?.unitType ?? item.unitType }]
                                                            })
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className='px-1 text-xs'
                                                        onClick={() => {
                                                            if (!displayedLabEquipment[index]) return
                                                            const newTotal = displayedLabEquipment[index].total + 1
                                                            setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq))
                                                            setEditedLabEquipment(prev => {
                                                                const existing = prev.find(eq => eq.id === item.id)
                                                                if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq)
                                                                return [...prev, { id: item.id, name: item.name, total: newTotal, unitType: displayedLabEquipment[index]?.unitType ?? item.unitType }]
                                                            })
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {displayedLabEquipment[index]?.total ?? item.total} {unitLabel(displayedLabEquipment[index]?.unitType ?? item.unitType)}
                                                </div>
                                                <div className="ml-auto flex items-center gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className={`h-8 w-8 ${(displayedLabEquipment[index]?.total === item.total && displayedLabEquipment[index]?.name === item.name && displayedLabEquipment[index]?.unitType === item.unitType) ? "hidden" : ""}`}
                                                        onClick={() => { updateLabEquipment(item.id) }}
                                                    >
                                                        <Check className='h-4 w-4' />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className={`h-8 w-8 ${(displayedLabEquipment[index]?.total === item.total && displayedLabEquipment[index]?.name === item.name && displayedLabEquipment[index]?.unitType === item.unitType) ? "" : "hidden"}`}
                                                        onClick={() => document.getElementById(item.id)?.focus()}
                                                    >
                                                        <PencilIcon className='h-4 w-4' />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteLabEquipment(item.id)}>
                                                        <Trash2 className='h-4 w-4 text-destructive' />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className='text-center text-muted-foreground'>No equipment added</div>
                                )}

                                {equipment !== null && isTeacher && (
                                    <div className="space-y-4">
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                                            <div className="text-sm font-medium mb-3">Session Equipment</div>
                                            {sessionEquipment === undefined && (
                                                <div className="text-sm text-muted-foreground italic">Loading session equipment...</div>
                                            )}
                                            {sessionEquipment !== undefined && sessionEquipmentDraft.length === 0 && (
                                                <div className="text-sm text-muted-foreground italic">No equipment configured for this session yet</div>
                                            )}
                                            {sessionEquipmentDraft.length > 0 && (
                                                <div className="space-y-2">
                                                    {sessionEquipmentDraft.map((item) => {
                                                        const reserved = reservedById.get(item.id) ?? 0
                                                        return (
                                                            <div key={item.id} className="flex items-center justify-between text-sm bg-background/40 p-2 rounded-lg border border-border/30">
                                                                <span className="font-medium">{item.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6"
                                                                        onClick={() => {
                                                                            if (item.available <= reserved) {
                                                                                toast.error("Cannot go below reserved amount")
                                                                                return
                                                                            }
                                                                            if (item.available <= 1 && reserved === 0) {
                                                                                setSessionEquipmentDraft(prev => prev.filter(eq => eq.id !== item.id))
                                                                                return
                                                                            }
                                                                            setSessionEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: Math.max(eq.available - 1, reserved) } : eq))
                                                                        }}
                                                                    >
                                                                        <MinusIcon className="h-3 w-3" />
                                                                    </Button>
                                                                    <Input
                                                                        className="h-6 w-12 text-center text-xs p-0 border-none bg-transparent focus-visible:ring-0"
                                                                        value={item.available}
                                                                        onChange={(e) => {
                                                                            let val = parseInt(e.target.value);
                                                                            if (isNaN(val)) val = 0;
                                                                            if (val < reserved) val = reserved;
                                                                            const cap = item.total;
                                                                            if (val > cap) val = cap;

                                                                            setSessionEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: val } : eq))
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            let val = parseInt(e.target.value);
                                                                            if (isNaN(val) || val < 1) {
                                                                                if (reserved > 0) {
                                                                                    setSessionEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: reserved } : eq))
                                                                                    return
                                                                                }
                                                                                if (val <= 0) {
                                                                                    setSessionEquipmentDraft(prev => prev.filter(eq => eq.id !== item.id));
                                                                                    return;
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span className="text-muted-foreground text-xs">
                                                                        {unitLabel(item.unitType)}
                                                                    </span>
                                                                    {reserved > 0 && (
                                                                        <span className="text-[10px] text-muted-foreground">Reserved: {reserved}</span>
                                                                    )}
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6"
                                                                        onClick={() => {
                                                                            const cap = item.total
                                                                            if (item.available >= cap) return
                                                                            setSessionEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq))
                                                                        }}
                                                                    >
                                                                        <PlusIcon className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6"
                                                                        onClick={() => {
                                                                            if (reserved > 0) {
                                                                                toast.error("Cannot remove equipment with reservations")
                                                                                return
                                                                            }
                                                                            setSessionEquipmentDraft(prev => prev.filter(eq => eq.id !== item.id))
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-muted/20 p-4 rounded-xl border border-border/40">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-sm font-medium">Add Equipment to Session</div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={addAllSessionEquipment}
                                                    disabled={!labEquipment || labEquipment.length === 0}
                                                >
                                                    Add All
                                                </Button>
                                            </div>
                                            {labEquipment && labEquipment.length > 0 ? (
                                                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                                                    {labEquipment
                                                        .filter(item => !sessionEquipmentDraft.some(eq => eq.id === item.id))
                                                        .map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between text-sm bg-background/30 p-2 rounded-lg border border-border/20">
                                                                <span className="text-muted-foreground">{item.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground mr-2">
                                                                        {item.total} {unitLabel(item.unitType)}
                                                                    </span>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6"
                                                                        onClick={() => {
                                                                            setSessionEquipmentDraft(prev => [...prev, { ...item, available: 1 }])
                                                                        }}
                                                                    >
                                                                        <PlusIcon className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    {labEquipment.filter(item => !sessionEquipmentDraft.some(eq => eq.id === item.id)).length === 0 && (
                                                        <div className="text-sm text-muted-foreground italic">All lab equipment is already in this session</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic">No lab equipment available to add</div>
                                            )}
                                        </div>

                                        <Button
                                            className="w-full"
                                            variant={theme === "dark" ? "default" : "secondary"}
                                            onClick={updateSessionEquipment}
                                            disabled={sessionEquipment === undefined || !hasSessionEquipmentChanges || updateSessionEquipmentMutation.isPending}
                                        >
                                            {updateSessionEquipmentMutation.isPending ? "Saving..." : "Save Session Equipment"}
                                        </Button>
                                    </div>
                                )}

                                {booking && equipment === null && (
                                    <div className="space-y-4">
                                        {(() => {
                                            if (myBooking) {
                                                // Unified View/Edit Mode
                                                return (
                                                    <div className="bg-muted/30 p-5 rounded-2xl border border-border/60">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="font-semibold text-lg flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-sky-500" />
                                                                Your Seat: {myBooking.name}
                                                            </div>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        disabled={isLate && !isTeacher}
                                                                    >
                                                                        Unbook
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will release seat {myBooking.name} and remove any reserved equipment.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => unbookSeat(myBooking.name)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Cancel Booking
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>

                                                        {/* Notes Section */}
                                                        <div className="space-y-2 mb-6">
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes for Teacher</label>
                                                                {notes !== initialNotes && <span className="text-[10px] text-amber-500 font-medium">Modified</span>}
                                                            </div>
                                                            <Textarea
                                                                placeholder="Enter notes for the teacher..."
                                                                value={notes}
                                                                onChange={(e) => setNotes(e.target.value)}
                                                                className="bg-background/50 resize-none h-24 text-sm focus-visible:ring-1 focus-visible:ring-primary/30"
                                                                disabled={isLate && !isTeacher}
                                                            />
                                                        </div>

                                                        {/* Booking Details / Equipment */}
                                                        <div className="space-y-2 mb-6">
                                                            <div className="flex items-center gap-2 border-b border-border/40 pb-1 mb-2">
                                                                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Booking Details</label>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {bookingEquipmentDraft.length > 0 ? (
                                                                    bookingEquipmentDraft.map((item, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between text-sm bg-background/40 p-2 rounded-lg border border-border/30">
                                                                            <span className="font-medium">{item.name}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <Button
                                                                                    type="button"
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-6 w-6"
                                                                                    onClick={() => {
                                                                                        if (item.available < 1) return;
                                                                                        if (item.available === 1) {
                                                                                            setBookingEquipmentDraft(prev => prev.filter(eq => eq.id !== item.id));
                                                                                        } else {
                                                                                            setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available - 1 } : eq));
                                                                                        }

                                                                                    }}
                                                                                    disabled={isLate && !isTeacher}
                                                                                >
                                                                                    <MinusIcon className="h-3 w-3" />
                                                                                </Button>
                                                                                <Input
                                                                                    className="h-6 w-12 text-center text-xs p-0 border-none bg-transparent focus-visible:ring-0"
                                                                                    value={item.available}
                                                                                    onChange={(e) => {
                                                                                        let val = parseInt(e.target.value);
                                                                                        if (isNaN(val)) val = 0;
                                                                                        if (val < 0) val = 0;
                                                                                        // Check global availability cap from displayedSessionEquipment + current holdings
                                                                                        const globalItem = displayedSessionEquipment.find(eq => eq.id === item.id);
                                                                                        const currentHolding = item.available;
                                                                                        const totalPool = (globalItem?.available ?? 0) + currentHolding;

                                                                                        if (val > totalPool) val = totalPool;

                                                                                        setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: val } : eq));

                                                                                        // Update global available count inverse to local holding
                                                                                        const delta = val - currentHolding;

                                                                                    }}
                                                                                    onBlur={(e) => {
                                                                                        let val = parseInt(e.target.value);
                                                                                        if (isNaN(val) || val <= 0) {
                                                                                            // Remove item if 0
                                                                                            const currentHolding = item.available;

                                                                                            setBookingEquipmentDraft(prev => prev.filter(eq => eq.id !== item.id));
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <span className="text-muted-foreground text-xs">
                                                                                    {unitLabel(item.unitType)}
                                                                                </span>
                                                                                <Button
                                                                                    type="button"
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-6 w-6"
                                                                                    onClick={() => {
                                                                                        const globalItem = displayedSessionEquipment.find(eq => eq.id === item.id);
                                                                                        if (!globalItem || globalItem.available < 1) return;

                                                                                        setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq));

                                                                                    }}
                                                                                    disabled={(isLate && !isTeacher) || !displayedSessionEquipment.find(eq => eq.id === item.id && eq.available > 0)}
                                                                                >
                                                                                    <PlusIcon className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-sm text-muted-foreground italic pl-2">No equipment selected</div>
                                                                )}
                                                            </div>

                                                            <div className="my-4 border-t border-border/40" />

                                                            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Add Equipment</div>
                                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                                                {displayedSessionEquipment
                                                                    .filter(item => item.available > 0)
                                                                    .map((item) => (
                                                                        <div key={item.id} className="flex items-center justify-between text-sm bg-muted/20 p-2 rounded-lg border border-border/20">
                                                                            <span className="text-muted-foreground">{item.name}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs text-muted-foreground mr-2">{item.available} {unitLabel(item.unitType)} left</span>
                                                                                <Button
                                                                                    type="button"
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className="h-6 w-6"
                                                                                    onClick={() => {
                                                                                        if (bookingEquipmentDraft.find(eq => eq.id === item.id)) {
                                                                                            setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq));
                                                                                        } else {
                                                                                            setBookingEquipmentDraft(prev => [...prev, { ...item, available: 1 }]);
                                                                                        }

                                                                                    }}
                                                                                    disabled={isLate && !isTeacher}
                                                                                >
                                                                                    <PlusIcon className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                {displayedSessionEquipment.filter(item => item.available > 0).length === 0 && (
                                                                    <div className="text-sm text-muted-foreground italic pl-2">
                                                                        {sessionEquipment && sessionEquipment.length === 0
                                                                            ? "No equipment configured for this session"
                                                                            : "No more equipment available"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Smart Save Action */}
                                                        <div className={`transition-all duration-300 ${isDirty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                                                            <Button
                                                                className="w-full font-semibold relative overflow-hidden group"
                                                                onClick={handleSaveChanges}
                                                                disabled={isLate && !isTeacher}
                                                            >
                                                                <span className="relative z-10">Save Changes</span>
                                                                <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                                            </Button>
                                                            <p className="text-[10px] text-center text-muted-foreground mt-2">
                                                                {isLate && !isTeacher ? "Modifications are locked" : "Save changes to update notes or equipment"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            }

                                            return null
                                        })()}
                                    </div>
                                )}
                                {pendingSeat && (
                                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 mb-4">
                                        <div className="font-medium text-center mb-2">Booking Seat: {pendingSeat}</div>
                                        {!myBooking && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium ml-1">Notes (Optional)</label>
                                                <Textarea
                                                    placeholder="Topic of study, specific requirements..."
                                                    value={notes}
                                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                                                    className="bg-background/50 resize-none h-20 text-sm"
                                                />
                                            </div>
                                        )}

                                        {!myBooking && (
                                            <div className="mt-4 space-y-4">
                                                <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
                                                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                                        Your Equipment Selection
                                                    </div>
                                                    {(bookingEquipmentDraft?.length ?? 0) > 0 ? (
                                                        <div className="space-y-2">
                                                            {bookingEquipmentDraft.map((item) => (
                                                                <div className='rounded-lg w-full border border-border/60 bg-background/50 flex text-center relative p-2 items-center justify-between select-none' key={item.id}>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7"
                                                                        onClick={() => {
                                                                            if (item.available < 1) return
                                                                            if (item.available === 1) {
                                                                                setBookingEquipmentDraft(prev => prev.filter(eq => eq.id !== item.id))
                                                                            } else {
                                                                                setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available - 1 } : eq))
                                                                            }

                                                                        }}
                                                                    >
                                                                        <MinusIcon className='h-4 w-4' />
                                                                    </Button>
                                                                    <div className='flex-1 font-medium'>{item.name}</div>
                                                                    <Input
                                                                        className="h-6 w-12 text-center text-xs p-0 border-none bg-transparent focus-visible:ring-0"
                                                                        value={item.available}
                                                                        onChange={(e) => {
                                                                            let val = parseInt(e.target.value);
                                                                            if (isNaN(val)) val = 0;
                                                                            if (val < 0) val = 0;
                                                                            const globalItem = displayedSessionEquipment.find(eq => eq.id === item.id);
                                                                            const currentHolding = item.available;
                                                                            // For pending seat (not booked yet), the displayedSessionEquipment has the pool.
                                                                            // But displayedSessionEquipment available count usually subtracts what is selected?
                                                                            // Yes, see the Plus icon logic:
                                                                            // setDisplayedSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available - 1 } : eq))

                                                                            const totalPool = (globalItem?.available ?? 0) + currentHolding;
                                                                            if (val > totalPool) val = totalPool;

                                                                            const delta = val - currentHolding;

                                                                            setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: val } : eq));

                                                                        }}
                                                                        onBlur={(e) => {
                                                                            let val = parseInt(e.target.value);
                                                                            if (isNaN(val) || val <= 0) {
                                                                                const currentHolding = item.available;

                                                                                setBookingEquipmentDraft(prev => prev.filter(eq => eq.id !== item.id));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className='text-sm text-muted-foreground text-xs'>
                                                                        {unitLabel(item.unitType)}
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-7 w-7"
                                                                        onClick={() => {
                                                                            const remaining = displayedSessionEquipment.find(eq => eq.id === item.id)?.available ?? 0
                                                                            if (remaining < 1) return
                                                                            setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq))

                                                                        }}
                                                                        disabled={!displayedSessionEquipment.find(eq => eq.id === item.id && eq.available > 0)}
                                                                    >
                                                                        <PlusIcon className='h-4 w-4' />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className='text-center text-muted-foreground text-sm py-2'>No equipment selected yet</div>
                                                    )}
                                                </div>

                                                <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                                                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Available Equipment</div>
                                                    {displayedSessionEquipment.some(item => item.available > 0) ? (
                                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                                            {displayedSessionEquipment
                                                                .filter((item) => item.available > 0)
                                                                .map((item) => (
                                                                    <div className='rounded-lg w-full border border-border/40 bg-background/30 flex text-center relative p-2 items-center justify-between select-none' key={item.id}>
                                                                        <Button
                                                                            type="button"
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-7 w-7"
                                                                            onClick={() => {
                                                                                if (item.available < 1) return
                                                                                if (bookingEquipmentDraft.find(eq => eq.id === item.id)) {
                                                                                    setBookingEquipmentDraft(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq))
                                                                                } else {
                                                                                    setBookingEquipmentDraft(prev => [...prev, { ...item, available: 1 }])
                                                                                }

                                                                            }}
                                                                        >
                                                                            <PlusIcon className='h-4 w-4' />
                                                                        </Button>
                                                                        <div className='flex-1 text-muted-foreground'>{item.name}</div>
                                                                        <div className='text-xs text-muted-foreground min-w-[80px] text-center'>
                                                                            {item.available} {unitLabel(item.unitType)} available
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    ) : (
                                                        <div className='text-center text-muted-foreground text-sm py-2'>
                                                            {sessionEquipment && sessionEquipment.length === 0
                                                                ? "No equipment configured for this session"
                                                                : "All equipment has been reserved"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {myBooking && (
                                            <div className="text-xs text-muted-foreground text-center mt-2">
                                                Notes and equipment stay the same when switching seats.
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                className="flex-1"
                                                variant={theme === "dark" ? "default" : "secondary"}
                                                onClick={async () => {
                                                    if (myBooking) {
                                                        const success = await switchSeat(pendingSeat)
                                                        if (!success) return
                                                        setPendingSeat(null)
                                                        return
                                                    }
                                                    const success = await bookSeat(pendingSeat)
                                                    if (!success) return
                                                    setPendingSeat(null)
                                                    setNotes("")
                                                }}
                                                disabled={(isLate && !isTeacher) || switchSeatMutation.isPending || bookSeatMutation.isPending}
                                            >
                                                {myBooking ? "Switch Seat" : "Confirm"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setPendingSeat(null)
                                                    if (!myBooking) setNotes("")
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {!booking && !pendingSeat && equipment === null && !isTeacher && (
                                    <div className="text-center text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg border border-border/40">
                                        Select a session from the calendar to book a seat and equipment.
                                    </div>
                                )}



                                {booking !== null && !myBooking && !pendingSeat && equipment === null && !isTeacher && (
                                    <div className="text-center text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg border border-border/40">
                                        Select a seat to book. Equipment options will appear after seat selection.
                                    </div>
                                )}



                            </div >
                        </div >}
                </div >
            </div >
            <div className="flex-1 min-h-0 px-4 pb-4">
                <CalendarPicker key={isPhysics ? "physics" : "biology"} lab={isPhysics ? "physics" : "biology"} isTeacher={isTeacher} />
            </div>
        </div >
    )
}

export default Lab
