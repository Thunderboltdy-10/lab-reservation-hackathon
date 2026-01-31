"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { equipmentAtom, isBookingAtom } from '@/lib/atoms'
import { api } from '@/trpc/react'
import useLab from '@/hooks/use-lab'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'
import CalendarPicker from './calendarPicker'
import { useTheme } from 'next-themes'
import { Input } from '@/components/ui/input'
import { MinusIcon, PencilIcon, PlusIcon, X, Settings } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ItemIndicator } from '@radix-ui/react-dropdown-menu'
import SeatGrid, { type LabConfig, parseLabConfig } from './SeatGrid'
import SeatConfigSlider from './SeatConfigSlider'

function SeatLegend({ booking, isPhysics }: { booking: string | null, isPhysics: boolean }) {
    if (!booking) return null;

    return (
        <aside
            role="region"
            aria-label="Seat color legend"
            className={`group absolute top-4 z-30 bg-gray-900/80 backdrop-blur-sm text-sm text-white rounded-lg p-3 shadow-lg border border-gray-700 ${isPhysics ? "left-4" : "right-4"}`}
        >
            <div className='group-hover:hidden cursor-pointer'>?</div>
            <div className='hidden group-hover:block'>
                <div className="font-medium mb-2">Key</div>
                <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border border-gray-700 bg-red-500" aria-hidden="true" />
                        <span>Occupied</span>
                    </li>

                    <li className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border border-gray-700 bg-yellow-500" aria-hidden="true" />
                        <span>Your booking</span>
                    </li>

                    <li className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border border-gray-700 bg-green-500" aria-hidden="true" />
                        <span>Available (hover)</span>
                    </li>
                </ul>
            </div>
        </aside>
    );
}


const Lab = ({ isPhysics, isTeacher }: { isPhysics: boolean, isTeacher: boolean }) => {
    const [booking, setBooking] = useAtom(isBookingAtom)
    const [equipment, setEquipment] = useAtom(equipmentAtom)
    const [displayedLabEquipment, setDisplayedLabEquipment] = useState<{ id: string, name: string, total: number }[]>([])
    const [editedLabEquipment, setEditedLabEquipment] = useState<{ id: string, name: string, total: number }[]>([])
    const [availableSessionEquipment, setAvailableSessionEquipment] = useState<{ name: string, id: string, total: number, available: number }[]>([])
    const [displayedSessionEquipment, setDisplayedSessionEquipment] = useState<{ name: string, id: string, total: number, available: number }[]>([])

    const [templateVisible, setTemplateVisible] = useState(false)
    const [templateName, setTemplateName] = useState("")
    const [templateTotal, setTemplateTotal] = useState(1)

    // Dynamic Seating State
    const [configVisible, setConfigVisible] = useState(false)
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
    const utils = api.useUtils()

    const { userId } = useAuth()
    const { theme } = useTheme()
    const labData = useLab({ lab: isPhysics ? "Physics" : "Biology" })

    const bookSeatMutation = api.account.bookSeatWithEquipment.useMutation()
    const unbookSeatMutation = api.account.unbookSeat.useMutation()
    const addLabEquipmentMutation = api.account.addLabEquipment.useMutation()
    const deleteLabEquipmentMutation = api.account.deleteLabEquipment.useMutation()
    const updateLabEquipmentMutation = api.account.updateLabEquipment.useMutation()
    const updateLabConfigMutation = api.account.updateLabConfig.useMutation()
    const updateSessionEquipmentMutation = api.account.updateSessionEquipment.useMutation()

    const config = useMemo(() => parseLabConfig(labData?.defaultRowConfig), [labData?.defaultRowConfig])

    const { data: seats } = api.account.getSeatIds.useQuery({
        labId: labData?.id!
    })
    const seatIds = seats ?? []

    const { data: occupiedSeats, refetch: refetchSeats } = api.account.getOccupiedSeats.useQuery({
        labId: labData?.id!,
        sessionId: booking!
    }, {
        enabled: booking !== null,
    })

    const { data: labEquipment, refetch: refetchLabEquipment } = api.account.getLabEquipment.useQuery({
        labId: labData?.id!
    })

    const { data: sessionEquipment, refetch: refetchSessionEquipment } = api.account.getSessionEquipment.useQuery({
        sessionId: (equipment ?? booking)!
    }, {
        enabled: equipment !== null || booking !== null
    })

    const bookSeat = (name: string) => {
        if (!booking || !labData) return

        bookSeatMutation.mutate({
            sessionId: booking,
            name,
            labId: labData.id,
            equipment: availableSessionEquipment.map(e => ({
                equipmentId: e.id,
                amount: e.available
            }))
        }, {
            onSuccess: () => {
                toast.success(`Seat ${name} successfully booked`)
                setBooking(null)
                refetchSeats()
            },
            onError: () => {
                toast.error("You cannot book more than 1 seat per session")
            }
        })
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
                setBooking(null)
                refetchSeats()
            },
            onError: () => {
                toast.error("You haven't booked this seat")
            }
        })
    }

    const addLabEquipment = () => {
        if (templateName === "") {
            toast.error("Please enter a name for the equipment")
            return
        }

        addLabEquipmentMutation.mutate({
            name: templateName,
            labId: labData?.id!,
            total: templateTotal
        }, {
            onSuccess: () => {
                toast.success(templateName + " successfully added")
                setTemplateVisible(false)
                setTemplateName("")
                setTemplateTotal(1)
                refetchLabEquipment()
            },
            onError: (error) => {
                toast.error("Error adding equipment")
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
                toast.error("Error deleting equipment")
            }
        })
    }

    const updateLabEquipment = (id: string) => {
        const eq = editedLabEquipment.find(e => e.id === id)
        if (!eq) return

        updateLabEquipmentMutation.mutate({
            id: eq.id,
            name: eq.name,
            total: eq.total
        }, {
            onSuccess: () => {
                toast.success("Equipment successfully updated")
                refetchLabEquipment()
            },
            onError: (error) => {
                toast.error("Error updating equipment")
            }
        })
    }

    const updateSessionEquipment = () => {
        const deletedEq = sessionEquipment?.filter(eq => !availableSessionEquipment.some(e => e.id === eq.equipmentId)) ?? []

        const addedEq = availableSessionEquipment.filter(eq => !sessionEquipment?.some(e => e.equipmentId === eq.id))

        const updatedEq = availableSessionEquipment.filter(
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
            },
            onError: (error) => {
                toast.error("Error updating session equipment")
            }
        })
    }

    useEffect(() => {
        if (!booking) return
        refetchSeats()
    }, [booking, refetchSeats])

    useEffect(() => {
        if (!equipment) return
        refetchSessionEquipment()
    }, [equipment, refetchSessionEquipment])

    useEffect(() => {
        if (!labEquipment) return
        setDisplayedLabEquipment(labEquipment.map(e => ({ id: e.id, name: e.name, total: e.total })))
        setDisplayedSessionEquipment(labEquipment.map(e => ({ name: e.name, id: e.id, total: e.total, available: e.total })))
    }, [labEquipment, refetchLabEquipment])

    useEffect(() => {
        if (!sessionEquipment) return

        if (equipment) {
            sessionEquipment.forEach(eq => {
                setDisplayedSessionEquipment(prev => prev.map(e => e.id === eq.equipmentId ? { ...e, available: e.available - eq.available } : e))
                setAvailableSessionEquipment(sessionEquipment.map(e => ({ name: e.equipment.name, id: e.equipmentId, total: e.equipment.total, available: e.id === eq.equipmentId ? e.available - eq.available : e.available })))
            });
        } else if (booking) {
            setAvailableSessionEquipment([])
            setDisplayedSessionEquipment(prev => prev.map(labEq => {
                const sessionEq = sessionEquipment.find(se => se.equipmentId === labEq.id)
                if (sessionEq) {
                    return { ...labEq, available: sessionEq.available - sessionEq.reserved }
                } else {
                    return { ...labEq, available: 0 }
                }
            }))
        }
    }, [sessionEquipment, refetchSessionEquipment, equipment, booking])

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="h-1/2 flex flex-col items-center p-4">
                <h1 className='flex items-center justify-center mb-5 text-3xl'>{isPhysics ? 'Physics/Chemistry Lab' : 'Biology Lab'}</h1>
                <div className='flex w-full max-w-5xl h-85 gap-10'>
                    <div className={`flex flex-1 border-2 relative rounded-lg bg-gray-800 p-6 gap-6 ${booking !== null ? "outline-blue" : ""}`}>
                        <SeatLegend booking={booking} isPhysics={isPhysics} />
                        {isPhysics && (
                            <div className="w-20 flex flex-col justify-between space-y-4">
                                <div className="h-2/3 w-2/3 bg-gray-700 rounded-r-lg shadow-md"></div>
                                <div className="h-1/6 w-2/3 bg-gray-600 rounded-t-lg shadow-md"></div>
                            </div>
                        )}


                        <SeatGrid
                            config={config}
                            occupiedSeats={occupiedSeats?.map(s => ({
                                id: s.seatId,
                                name: s.name,
                                userId: s.userId,
                                status: s.status,
                                user: s.user
                            })) ?? []}
                            currentUserId={userId}
                            onSeatClick={(seatName, isOccupied, isUserSeat) => {
                                if (!booking && !isTeacher && !configVisible) {
                                    toast.error("Please select a session first")
                                    return
                                }
                                if (isOccupied && !isUserSeat && !isTeacher) {
                                    toast.error("This seat is occupied")
                                    return
                                }
                                setSelectedSeat(seatName)
                            }}
                            disabled={!booking && !isTeacher}
                            isTeacher={isTeacher}
                        />

                        {isTeacher && (
                            <div className="absolute top-4 right-16 z-20">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => setConfigVisible(true)}
                                    title="Configure Layout"
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
                                                onClick={() => {
                                                    if (selectedSeat) bookSeat(selectedSeat)
                                                    setSelectedSeat(null)
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
                                <SeatConfigSlider
                                    initialConfig={config}
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

                        {!isPhysics && (
                            <div className="w-20 flex flex-col justify-between  items-end space-y-4">
                                <div className="h-2/3 w-2/3 bg-gray-700 rounded-l-lg shadow-md"></div>
                                <div className="h-1/6 w-2/3 bg-gray-600 rounded-t-lg shadow-md"></div>
                            </div>
                        )}

                    </div>
                    {(isTeacher || booking) &&
                        <div className={`flex flex-col border-2 relative rounded-lg bg-gray-800 p-3 gap-6 transition-all duration-400 ease-in-out ${(booking !== null || equipment !== null) ? "outline-blue" : ""} ${(booking === null || equipment !== null) ? "w-90" : "w-64"}`}>
                            <div className={`flex items-center ${(booking === null && equipment === null) ? "justify-between" : "justify-center"}`}>
                                <div className={`text-white font-semibold text-xl pl-2 ${booking === null && equipment === null ? "" : "pt-2"}`}>{booking ? "Choose Equipment" : equipment ? "Session Equipment" : "Lab Equipment"}</div>
                                {booking === null && equipment === null && isTeacher &&
                                    <Button
                                        variant={theme === "dark" ? "default" : "secondary"}
                                        onClick={() => setTemplateVisible(true)}
                                    >+ Add Equipment</Button>
                                }
                            </div>
                            <div className='max-h-full overflow-y-auto flex flex-col gap-2'>
                                {(templateVisible && !booking && !equipment) && <div className='bg-gray-800 rounded-lg w-full flex text-center border-2 border-gray-600 relative p-2 items-center text-white'>
                                    <Input type="text"
                                        className='!bg-transparent w-fit max-w-[150px] mr-2 border-none focus-visible:ring-0 focus-visible:ring-offset-0' placeholder="Equipment Name"
                                        autoFocus
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                    />
                                    <div className="flex items-center border-rounded-md">
                                        <div
                                            className={`flex-1 cursor-pointer select-none ${templateTotal === 1 ? "opacity-50" : ""}`}
                                            onClick={() => setTemplateTotal((q) => (q > 1 ? q - 1 : 1))}
                                        >-</div>
                                        <Input type='text'
                                            className='!bg-transparent w-10 border-none text-center focus-visible:ring-0 focus-visible:ring-offset-0' placeholder="Quantity"
                                            value={templateTotal}
                                            onChange={(e) => setTemplateTotal(parseInt(e.target.value) > 1 ? parseInt(e.target.value) : 1)}
                                        />
                                        <div
                                            className='flex-1 cursor-pointer select-none'
                                            onClick={() => setTemplateTotal(q => q + 1)}
                                        >+</div>
                                    </div>
                                    <Button className='flex-1 ml-4 mr-1'
                                        variant={theme === "dark" ? "default" : "secondary"}
                                        onClick={() => addLabEquipment()}>Add</Button>
                                    <div className='w-fit cursor-pointer' onClick={() => {
                                        setTemplateVisible(false)
                                        setTemplateName("")
                                        setTemplateTotal(1)
                                    }}><X size="icon" className='w-5' /></div>
                                </div>}
                                {(!booking && !equipment) && ((labEquipment?.length ?? 0) > 0 ? labEquipment && labEquipment.map((item, index) => (
                                    <div className='bg-gray-800 rounded-lg w-full flex text-center border-2 border-gray-600 relative p-2 items-center justify-between text-white' key={index}>
                                        <Input type="text" id={item.id}
                                            className='!bg-transparent w-fit max-w-[150px] mr-2 border-none focus-visible:ring-0 focus-visible:ring-offset-0' placeholder="Equipment Name"
                                            value={displayedLabEquipment[index]?.name ?? ""}
                                            onChange={(e) => {
                                                const newName = e.target.value

                                                setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, name: newName } : eq))

                                                setEditedLabEquipment(prev => {
                                                    const existing = prev.find(eq => eq.id === item.id)
                                                    if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, name: newName } : eq)
                                                    else return [...prev, { id: item.id, name: newName, total: item.total }]
                                                })
                                            }}
                                        />
                                        <div className="flex items-center border-rounded-md">
                                            <div
                                                className={`flex-1 cursor-pointer select-none ${displayedLabEquipment[index]?.total === 1 ? "opacity-50" : ""}`}
                                                onClick={() => {
                                                    if (!displayedLabEquipment[index]) return
                                                    const newTotal = Math.max(1, displayedLabEquipment[index].total - 1)

                                                    setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq))

                                                    setEditedLabEquipment(prev => {
                                                        const existing = prev.find(eq => eq.id === item.id)
                                                        if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq)
                                                        else return [...prev, { id: item.id, name: item.name, total: newTotal }]
                                                    })
                                                }}
                                            >-</div>
                                            <Input type='text'
                                                className='!bg-transparent w-10 border-none text-center focus-visible:ring-0 focus-visible:ring-offset-0' placeholder="Quantity"
                                                value={displayedLabEquipment[index]?.total ?? ""}
                                                onChange={(e) => {
                                                    var newTotal = parseInt(e.target.value)
                                                    if (e.target.value === "") newTotal = 1
                                                    if (newTotal < 1) return

                                                    setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq))

                                                    setEditedLabEquipment(prev => {
                                                        const existing = prev.find(eq => eq.id === item.id)
                                                        if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq)
                                                        else return [...prev, { id: item.id, name: item.name, total: newTotal }]
                                                    })
                                                }}
                                            />
                                            <div
                                                className='flex-1 cursor-pointer select-none'
                                                onClick={() => {
                                                    if (!displayedLabEquipment[index]) return
                                                    const newTotal = displayedLabEquipment[index].total + 1

                                                    setDisplayedLabEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq))

                                                    setEditedLabEquipment(prev => {
                                                        const existing = prev.find(eq => eq.id === item.id)
                                                        if (existing) return prev.map(eq => eq.id === item.id ? { ...eq, total: newTotal } : eq)
                                                        else return [...prev, { id: item.id, name: item.name, total: newTotal }]
                                                    })
                                                }}
                                            >+</div>
                                        </div>
                                        <Button
                                            className={`flex-1 ml-4 mr-1 ${(displayedLabEquipment[index]?.total === item.total && displayedLabEquipment[index]?.name === item.name) ? "hidden" : ""}`}
                                            variant={theme === "dark" ? "default" : "secondary"}
                                            onClick={() => { updateLabEquipment(item.id) }}>Save</Button>
                                        <div
                                            className={`w-fit cursor-pointer ${(displayedLabEquipment[index]?.total === item.total && displayedLabEquipment[index]?.name === item.name) ? "" : "hidden"}`}
                                            onClick={() => document.getElementById(item.id)?.focus()}><PencilIcon size="icon" className='w-5' /></div>
                                        <div className='w-fit cursor-pointer' onClick={() => {
                                            deleteLabEquipment(item.id)
                                        }}><X size="icon" className='w-5' /></div>
                                    </div>
                                )) : <div className='text-center text-gray-400'>No equipment added</div>)}
                                {equipment !== null && <div>
                                    {(availableSessionEquipment?.length ?? 0 > 0) ? (availableSessionEquipment && availableSessionEquipment.map((item, index) => (
                                        <div className='bg-gray-800 rounded-lg w-full border-2 border-gray-600 flex text-center  relative p-2 items-center justify-between mb-2 select-none' key={index}>
                                            {displayedSessionEquipment.find(eq => eq.id === item.id && eq.available > 0) &&
                                                <div className='cursor-pointer' onClick={() => {
                                                    const remaining = displayedSessionEquipment.find(eq => eq.id === item.id)?.available ?? 0
                                                    if (remaining < 1) return

                                                    setAvailableSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq))
                                                    setDisplayedSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available - 1 } : eq))
                                                }}><PlusIcon size="icon" className='w-5' /></div>
                                            }
                                            <div className='cursor-pointer ml-1' onClick={() => {
                                                if (item.available < 1) return
                                                if (item.available === 1) {
                                                    setAvailableSessionEquipment(prev => prev.filter(eq => eq.id !== item.id))
                                                } else {
                                                    setAvailableSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available - 1 } : eq))
                                                }

                                                setDisplayedSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq))
                                            }}><MinusIcon size="icon" className='w-5' /></div>
                                            <div className='flex-1 mr-8'>{item.name}</div>
                                            <div className='mr-2'>{item.available}</div>
                                        </div>
                                    ))) : <div className='text-center text-gray-400'>No equipment chosen</div>}
                                    <div className='border-2 border-gray-400 rounded-md my-4'></div>
                                    <div><div className='font-medium my-4 text-center'>Lab Equipment Available</div></div>
                                    {(displayedSessionEquipment?.length ?? 0 > 0) ? (displayedSessionEquipment && displayedSessionEquipment.map((item, index) => (
                                        item.available > 0 && (
                                            <div className='bg-gray-800 rounded-lg w-full border-2 border-gray-600 flex text-center  relative p-2 items-center justify-between mb-2 select-none' key={index}>
                                                <div className='cursor-pointer' onClick={() => {
                                                    if (item.available < 1) return

                                                    if (availableSessionEquipment.find(eq => eq.id === item.id)) {
                                                        setAvailableSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available + 1 } : eq))
                                                    } else {
                                                        setAvailableSessionEquipment(prev => [...prev, { ...item, available: 1 }])
                                                    }
                                                    setDisplayedSessionEquipment(prev => prev.map(eq => eq.id === item.id ? { ...eq, available: eq.available - 1 } : eq))
                                                }}><PlusIcon size="icon" className='w-5' /></div>
                                                <div className='flex-1'>{item.name}</div>
                                                <div className='mr-2'>{item.available}</div>
                                            </div>
                                        )
                                    ))) : <div className='text-center text-gray-400'>No equipment available</div>}
                                </div>}
                                {sessionEquipment && availableSessionEquipment &&
                                    (() => {
                                        const hasChanges = availableSessionEquipment.some(e => {
                                            const match = sessionEquipment.find(eq => eq.equipmentId === e.id);
                                            if (!match) return true;
                                            return match.available !== e.available;
                                        }) || sessionEquipment.some(e => {
                                            const stillExists = availableSessionEquipment.find(eq => eq.id === e.equipmentId)
                                            return !stillExists
                                        })

                                        return hasChanges;
                                    })() && isTeacher && (
                                        <Button
                                            className="w-full mt-4"
                                            variant={theme === "dark" ? "default" : "secondary"}
                                            onClick={updateSessionEquipment}
                                        >
                                            Save
                                        </Button>
                                    )
                                }
                            </div>
                        </div>}
                </div>
            </div>
            <div className="h-1/2">
                <CalendarPicker key={isPhysics ? "physics" : "biology"} lab={isPhysics ? "physics" : "biology"} isTeacher={isTeacher} /></div>
        </div>
    )
}

export default Lab