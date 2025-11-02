"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { isBookingAtom } from '@/lib/atoms'
import { api } from '@/trpc/react'
import useLab from '@/hooks/use-lab'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'
import CalendarPicker from './calendarPicker'

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

    const {userId} = useAuth()
    const labId = useLab({lab: isPhysics ? "Physics" : "Biology"})

    const bookSeatMutation = api.account.bookSeat.useMutation()
    const unbookSeatMutation = api.account.unbookSeat.useMutation()

    const {data: seats} = api.account.getSeatIds.useQuery({
        labId: labId!
    })
    const seatIds = seats ?? []

    const {data: occupiedSeats, refetch} = api.account.getOccupiedSeats.useQuery({
        labId: labId!,
        sessionId: booking!
    }, {
        enabled: booking !== null,
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
                refetch()
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
                refetch()
            },
            onError: () => {
                toast.error("You haven't booked this seat")
            }
        })
    }

    useEffect(() => {
        if (!booking) return
        refetch()
    }, [booking, refetch])

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
                    <div className={`flex w-64 border-2 relative rounded-lg justify-center bg-gray-800 p-6 gap-6 ${booking !== null ? "outline-blue" : ""}`}>
                        <div className="font-semibold text-xl">Lab Equipment</div>

                    </div>}
                </div>
            </div>
            <div className="h-1/2">
            <CalendarPicker key={isPhysics ? "physics": "biology"} lab={isPhysics ? "physics" : "biology"} isTeacher={isTeacher}/></div>
        </div>
    )
}

export default Lab