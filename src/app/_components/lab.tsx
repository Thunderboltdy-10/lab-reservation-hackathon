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
import { PencilIcon, PlusIcon, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

function SeatLegend({ booking, isPhysics }: { booking: string | null, isPhysics: boolean}) {
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


const Lab = ({isPhysics, isTeacher}: {isPhysics: boolean, isTeacher: boolean}) => {
    const [booking, setBooking] = useAtom(isBookingAtom)
    const [equipment, setEquipment] = useAtom(equipmentAtom)
    const [editableEquipment, setEditableEquipment] = useState<{id: string, name: string, total: number}[]>([])
    const [changedEquipment, setChangedEquipment] = useState<{id: string, name: string, total: number}[]>([])

    const [templateVisible, setTemplateVisible] = useState(false)
    const [templateName, setTemplateName] = useState("")
    const [templateTotal, setTemplateTotal] = useState(1)

    const {userId} = useAuth()
    const {theme} = useTheme()
    const labId = useLab({lab: isPhysics ? "Physics" : "Biology"})

    const bookSeatMutation = api.account.bookSeat.useMutation()
    const unbookSeatMutation = api.account.unbookSeat.useMutation()
    const addLabEquipmentMutation = api.account.addLabEquipment.useMutation()
    const deleteLabEquipmentMutation = api.account.deleteLabEquipment.useMutation()
    const updateLabEquipmentMutation = api.account.updateLabEquipment.useMutation()

    const {data: seats} = api.account.getSeatIds.useQuery({
        labId: labId!
    })
    const seatIds = seats ?? []

    const {data: occupiedSeats, refetch: refetchSeats} = api.account.getOccupiedSeats.useQuery({
        labId: labId!,
        sessionId: booking!
    }, {
        enabled: booking !== null,
    })

    const {data: labEquipment, refetch: refetchLabEquipment} = api.account.getLabEquipment.useQuery({
        labId: labId!
    })

    const {data: sessionEquipment, refetch: refetchSessionEquipment} = api.account.getSessionEquipment.useQuery({
        sessionId: equipment!
    }, {
        enabled: equipment !== null
    })

    const bookSeat = (name: string) => {
        if (!booking || !labId) return

        bookSeatMutation.mutate({
            sessionId: booking,
            name,
            labId: labId
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
        if (!booking || !labId) return

        unbookSeatMutation.mutate({
            sessionId: booking,
            name,
            labId: labId,
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
            labId: labId!,
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
        const newEquipment = changedEquipment.find(e => e.id === id)
        if (!newEquipment) return

        updateLabEquipmentMutation.mutate({
            id: newEquipment.id,
            name: newEquipment.name,
            total: newEquipment.total
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

        setEditableEquipment(labEquipment.map(e => ({id: e.id, name: e.name, total: e.total})))
    }, [labEquipment, refetchLabEquipment])

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="h-1/2 flex flex-col items-center p-4">
                <h1 className='flex items-center justify-center mb-5 text-3xl'>{isPhysics ? 'Physics/Chemistry Lab' : 'Biology Lab'}</h1>
                <div className='flex w-full max-w-5xl h-85 gap-10'>
                    <div className={`flex flex-1 border-2 relative rounded-lg bg-gray-800 p-6 gap-6 ${booking !== null ? "outline-blue" : ""}`}>
                        <SeatLegend booking={booking} isPhysics={isPhysics}/>
                        {isPhysics && (
                            <div className="w-20 flex flex-col justify-between space-y-4">
                            <div className="h-2/3 w-2/3 bg-gray-700 rounded-r-lg shadow-md"></div>
                            <div className="h-1/6 w-2/3 bg-gray-600 rounded-t-lg shadow-md"></div>
                            </div>
                        )}

                        <div className="flex-1 flex flex-col gap-4">
                        <div className="grid grid-cols-4 gap-2 flex-1">
                            {['A1','A2','A3','A4'].map((seat, i) => (
                                <Dialog key={i}>
                                    <DialogTrigger asChild>
                                        <div
                                            onClick={(e) => {
                                                if (!booking) e.preventDefault()
                                                if (occupiedSeats?.some(s => s.name === seat)) {
                                                    if (occupiedSeats?.some(s => s.name === seat && s.userId !== userId && !isTeacher)) {
                                                        e.preventDefault()
                                                        toast.error("This seat is occupied")
                                                    }
                                                }
                                            }}
                                            className={`flex-1 bg-gray-700 rounded-lg shadow-md  flex items-center justify-center transition-colors text-white 
                                                ${occupiedSeats?.some(s => s.name === seat && s.userId !== userId) && booking ? `bg-red-500 ${!isTeacher  ? "cursor-not-allowed" : "cursor-pointer"}` : ""} 
                                                ${occupiedSeats?.some(s => s.name === seat && s.userId === userId) && booking ? "bg-yellow-500 cursor-pointer" : ""} 
                                                ${booking && !occupiedSeats?.some(s => s.name === seat) ? "hover:!bg-green-500 animate-pulse hover:!animate-none cursor-pointer" : ""}
                                                `
                                            }
                                        >
                                            {occupiedSeats?.some(s => s.name === seat && s.userId !== userId) && booking ? occupiedSeats.find(s => s.name === seat)!.user.firstName + " " + occupiedSeats.find(s => s.name === seat)!.user.lastName : seat}
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent>
                                        {occupiedSeats?.some(s => s.name === seat && s.userId === userId) ? (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to unbook the seat {seat}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="destructive" className="flex-1" onClick={() => unbookSeat(seat)}>Unbook</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ) : (occupiedSeats?.some(s => s.name === seat && s.userId !== userId) ? (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to unbook the seat {seat} for {occupiedSeats?.find(s => s.name === seat)?.user.firstName + " " + occupiedSeats?.find(s => s.name === seat)?.user.lastName}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="destructive" className="flex-1" onClick={() => unbookSeat(seat)}>Unbook</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ) : (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to book the seat {seat}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button className="flex-1" onClick={() => bookSeat(seat)}>Book</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ))}
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>

                        <div className="h-4 bg-blue-400 rounded"></div>
                        <div className="grid grid-cols-4 gap-2 flex-1">
                            {['B1','B2','B3','B4'].map((seat, i) => (
                                <Dialog key={i}>
                                    <DialogTrigger asChild>
                                        <div
                                            onClick={(e) => {
                                                if (!booking) e.preventDefault()
                                                if (occupiedSeats?.some(s => s.name === seat)) {
                                                    if (occupiedSeats?.some(s => s.name === seat && s.userId !== userId && !isTeacher)) {
                                                        e.preventDefault()
                                                        toast.error("This seat is occupied")
                                                    }
                                                }
                                            }}
                                            className={`flex-1 bg-gray-700 rounded-lg shadow-md  flex items-center justify-center transition-colors text-white 
                                                ${occupiedSeats?.some(s => s.name === seat && s.userId !== userId) && booking ? `bg-red-500 ${!isTeacher  ? "cursor-not-allowed" : "cursor-pointer"}` : ""} 
                                                ${occupiedSeats?.some(s => s.name === seat && s.userId === userId) && booking ? "bg-yellow-500 cursor-pointer" : ""} 
                                                ${booking && !occupiedSeats?.some(s => s.name === seat) ? "hover:!bg-green-500 animate-pulse hover:!animate-none cursor-pointer" : ""}
                                                `
                                            }
                                        >
                                            {occupiedSeats?.some(s => s.name === seat && s.userId !== userId) && booking ? occupiedSeats.find(s => s.name === seat)!.user.firstName + " " + occupiedSeats.find(s => s.name === seat)!.user.lastName : seat}
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent>
                                        {occupiedSeats?.some(s => s.name === seat && s.userId === userId) ? (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to unbook the seat {seat}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="destructive" className="flex-1" onClick={() => unbookSeat(seat)}>Unbook</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ) : (occupiedSeats?.some(s => s.name === seat && s.userId !== userId) ? (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to unbook the seat {seat} for {occupiedSeats?.find(s => s.name === seat)?.user.firstName + " " + occupiedSeats?.find(s => s.name === seat)?.user.lastName}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="destructive" className="flex-1" onClick={() => unbookSeat(seat)}>Unbook</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ) : (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to book the seat {seat}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button className="flex-1" onClick={() => bookSeat(seat)}>Book</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ))}
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>

                        <div className="flex-1"></div>

                        <div className="grid grid-cols-2 gap-2 flex-1">
                            {['C1','C2'].map((seat, i) => (
                                <Dialog key={i}>
                                    <DialogTrigger asChild>
                                        <div
                                            onClick={(e) => {
                                                if (!booking) e.preventDefault()
                                                if (occupiedSeats?.some(s => s.name === seat)) {
                                                    if (occupiedSeats?.some(s => s.name === seat && s.userId !== userId && !isTeacher)) {
                                                        e.preventDefault()
                                                        toast.error("This seat is occupied")
                                                    }
                                                }
                                            }}
                                            className={`flex-1 bg-gray-700 rounded-lg shadow-md  flex items-center justify-center transition-colors text-white 
                                                ${occupiedSeats?.some(s => s.name === seat && s.userId !== userId) && booking ? `bg-red-500 ${!isTeacher  ? "cursor-not-allowed" : "cursor-pointer"}` : ""} 
                                                ${occupiedSeats?.some(s => s.name === seat && s.userId === userId) && booking ? "bg-yellow-500 cursor-pointer" : ""} 
                                                ${booking && !occupiedSeats?.some(s => s.name === seat) ? "hover:!bg-green-500 animate-pulse hover:!animate-none cursor-pointer" : ""}
                                                `
                                            }
                                        >
                                            {occupiedSeats?.some(s => s.name === seat && s.userId !== userId) && booking ? occupiedSeats.find(s => s.name === seat)!.user.firstName + " " + occupiedSeats.find(s => s.name === seat)!.user.lastName : seat}
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent>
                                        {occupiedSeats?.some(s => s.name === seat && s.userId === userId) ? (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to unbook the seat {seat}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="destructive" className="flex-1" onClick={() => unbookSeat(seat)}>Unbook</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ) : (occupiedSeats?.some(s => s.name === seat && s.userId !== userId) ? (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to unbook the seat {seat} for {occupiedSeats?.find(s => s.name === seat)?.user.firstName + " " + occupiedSeats?.find(s => s.name === seat)?.user.lastName}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="destructive" className="flex-1" onClick={() => unbookSeat(seat)}>Unbook</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ) : (
                                            <DialogHeader className='flex text-center items-center'>
                                                <DialogTitle>Are you sure you want to book the seat {seat}?</DialogTitle>
                                                <div className="flex gap-2 mt-5 w-full">
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button className="flex-1" onClick={() => bookSeat(seat)}>Book</Button>
                                                    </DialogClose>
                                                    <DialogClose className='flex-1' asChild>
                                                        <Button variant="secondary">Cancel</Button>
                                                    </DialogClose>
                                                </div>
                                            </DialogHeader>
                                        ))}
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>

                        <div className="h-4 bg-blue-400 rounded"></div>
                        </div>

                        {!isPhysics && (
                            <div className="w-20 flex flex-col justify-between  items-end space-y-4">
                            <div className="h-2/3 w-2/3 bg-gray-700 rounded-l-lg shadow-md"></div>
                            <div className="h-1/6 w-2/3 bg-gray-600 rounded-t-lg shadow-md"></div>
                            </div>
                        )}

                    </div>
                    {isTeacher &&
                    <div className={`flex flex-col border-2 relative rounded-lg bg-gray-800 p-3 gap-6 transition-all duration-400 ease-in-out ${(booking !== null || equipment !== null) ? "outline-blue" : ""} ${(booking === null || equipment !== null) ? "w-90" : "w-64"}`}>
                        <div className={`flex items-center ${(booking === null && equipment === null) ? "justify-between" : "justify-center"}`}>
                            <div className={`text-white font-semibold text-xl pl-2 ${booking === null && equipment === null ? "" : "pt-2"}`}>{booking ? "Choose Equipment" : equipment ? "Session Equipment" : "Lab Equipment"}</div>
                            {booking === null && equipment === null && 
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
                                }}><X size="icon" className='w-5'/></div>
                            </div>}
                            {(!booking && !equipment) && ((labEquipment?.length ?? 0) > 0 ? labEquipment && labEquipment.map((item, index) => (
                                <div className='bg-gray-800 rounded-lg w-full flex text-center border-2 border-gray-600 relative p-2 items-center justify-between text-white' key={index}>
                                    <Input type="text" id={item.id}
                                        className='!bg-transparent w-fit max-w-[150px] mr-2 border-none focus-visible:ring-0 focus-visible:ring-offset-0' placeholder="Equipment Name"
                                        value={editableEquipment[index]?.name ?? ""}
                                        onChange={(e) => {
                                            const newName = e.target.value

                                            setEditableEquipment(prev => prev.map(eq => eq.id === item.id ? {...eq, name: newName} : eq))

                                            setChangedEquipment(prev => {
                                                const existing = prev.find(eq => eq.id === item.id)
                                                if (existing) return prev.map(eq => eq.id === item.id ? {...eq, name: newName} : eq)
                                                else return [...prev, {id: item.id, name: newName, total: item.total}]
                                            })
                                        }}
                                    />
                                    <div className="flex items-center border-rounded-md">
                                        <div
                                            className={`flex-1 cursor-pointer select-none ${editableEquipment[index]?.total === 1 ? "opacity-50" : ""}`}
                                            onClick={() => {
                                                if (!editableEquipment[index]) return
                                                const newTotal = Math.max(1, editableEquipment[index].total - 1)

                                                setEditableEquipment(prev => prev.map(eq => eq.id === item.id ? {...eq, total: newTotal} : eq))

                                                setChangedEquipment(prev => {
                                                    const existing = prev.find(eq => eq.id === item.id)
                                                    if (existing) return prev.map(eq => eq.id === item.id ? {...eq, total: newTotal} : eq)
                                                    else return [...prev, {id: item.id, name: item.name, total: newTotal}]
                                                })
                                            }}
                                        >-</div>
                                        <Input type='text'
                                            className='!bg-transparent w-10 border-none text-center focus-visible:ring-0 focus-visible:ring-offset-0' placeholder="Quantity"
                                            value={editableEquipment[index]?.total ?? ""}
                                            onChange={(e) => {
                                                var newTotal = parseInt(e.target.value)
                                                if (e.target.value === "") newTotal = 1
                                                if (newTotal < 1) return

                                                setEditableEquipment(prev => prev.map(eq => eq.id === item.id ? {...eq, total: newTotal} : eq))

                                                setChangedEquipment(prev => {
                                                    const existing = prev.find(eq => eq.id === item.id)
                                                    if (existing) return prev.map(eq => eq.id === item.id ? {...eq, total: newTotal} : eq)
                                                    else return [...prev, {id: item.id, name: item.name, total: newTotal}]
                                                })
                                            }}
                                        />
                                        <div
                                            className='flex-1 cursor-pointer select-none'
                                            onClick={(e) => {
                                                if (!editableEquipment[index]) return
                                                const newTotal = editableEquipment[index].total + 1

                                                setEditableEquipment(prev => prev.map(eq => eq.id === item.id ? {...eq, total: newTotal} : eq))

                                                setChangedEquipment(prev => {
                                                    const existing = prev.find(eq => eq.id === item.id)
                                                    if (existing) return prev.map(eq => eq.id === item.id ? {...eq, total: newTotal} : eq)
                                                    else return [...prev, {id: item.id, name: item.name, total: newTotal}]
                                                })
                                            }}
                                        >+</div>
                                    </div>
                                    <Button
                                    className={`flex-1 ml-4 mr-1 ${(editableEquipment[index]?.total === item.total && editableEquipment[index]?.name === item.name) ? "hidden" : ""}`}
                                    variant={theme === "dark" ? "default" : "secondary"}
                                    onClick={() => {updateLabEquipment(item.id)}}>Save</Button>
                                    <div
                                    className={`w-fit cursor-pointer ${(editableEquipment[index]?.total === item.total && editableEquipment[index]?.name === item.name) ? "" : "hidden"}`}
                                    onClick={() => document.getElementById(item.id)?.focus()}><PencilIcon size="icon" className='w-5' /></div>
                                    <div className='w-fit cursor-pointer' onClick={() => {
                                        deleteLabEquipment(item.id)
                                    }}><X size="icon" className='w-5'/></div>
                                </div>
                            )) : <div className='text-center text-gray-400'>No equipment added</div>)}
                            {equipment !== null && <div>
                                {(sessionEquipment?.length ?? 0 > 0) ? (sessionEquipment && sessionEquipment.map((item, index) => (
                                    <div className='bg-gray-800 rounded-lg w-full border-2 border-gray-600 flex text-center  relative p-2 items-center justify-between mb-2' key={index}>
                                        <div className='cursor-pointer'><PlusIcon size="icon" className='w-5' /></div>
                                        <div className='flex-1'>{item.equipment.id}</div>
                                        <div className='mr-2'>{item.available}</div>
                                    </div>
                                ))) : <div className='text-center text-gray-400'>No equipment chosen</div>}
                                <div className="border-2 border-gray-600 rounded-lg my-2"></div>
                                {(labEquipment?.length ?? 0 > 0) ? (labEquipment && labEquipment.map((item, index) => (
                                    <div className='bg-gray-800 rounded-lg w-full border-2 border-gray-600 flex text-center  relative p-2 items-center justify-between mb-2' key={index}>
                                        <div className='cursor-pointer'><PlusIcon size="icon" className='w-5' /></div>
                                        <div className='flex-1'>{item.name}</div>
                                        <div className='mr-2'>{item.total}</div>
                                    </div>
                                ))) : <div className='text-center text-gray-400'>No equipment available</div>}
                            </div>}
                        </div>
                    </div>}
                </div>
            </div>
            <div className="h-1/2">
            <CalendarPicker key={isPhysics ? "physics": "biology"} lab={isPhysics ? "physics" : "biology"} isTeacher={isTeacher}/></div>
        </div>
    )
}

export default Lab