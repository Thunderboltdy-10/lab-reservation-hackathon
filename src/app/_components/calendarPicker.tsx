"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { api } from '@/trpc/react'
import { DatabaseZap } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {atom, useAtom} from "jotai"
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { equipmentAtom, isBookingAtom } from '@/lib/atoms'
import { useAuth } from '@clerk/nextjs'
import { useTheme } from 'next-themes'

const CalendarPicker = ({lab, isTeacher}: {lab: string | null, isTeacher: boolean}) => {
    const [date, setDate] = React.useState<Date | undefined>(undefined)
    const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)

    const [isPopupOpenAdd, setIsPopupOpenAdd] = useState(false)

    const [booking, setBooking] = useAtom(isBookingAtom)
    const [equipment, setEquipment] = useAtom(equipmentAtom)

    const {userId} = useAuth()
    const {theme} = useTheme()

    const {data: labId} = api.account.getLabId.useQuery({
        lab: lab!
    }, {
        enabled: !!lab
    })

    const createSessionMutation = api.account.createSession.useMutation()
    const updateSessionMutation = api.account.updateSession.useMutation()
    const removeSessionMutation = api.account.removeSession.useMutation()

    const normalisedDate = useMemo(() => {
        if (!date) return undefined
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }, [date])

    const {data, refetch} = api.account.getSession.useQuery({
        labId: labId!,
        date: normalisedDate
    },{
        enabled: !!date,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    })

    const createSession = () => {
        setBooking(null)
        if (!date || !lab || !labId) return

        if (!startDate || !endDate) return

        if (endDate.getTime() - startDate.getTime() < 5 * 60 * 1000) {
            toast.error("Session must be at least 5 minutes long")
            return
        }

        console.log(startDate)
        console.log(endDate)

        createSessionMutation.mutate({
            labId,
            startAt: startDate,
            endAt: endDate,
        },
        {
            onSuccess: () => {
                setIsPopupOpenAdd(false)
                toast.success("Session successfully created")
                refetch()
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    const updateSession = (id: string) => {
        setBooking(null)
        if (!date || !lab || !labId || !id) return

        if (!startDate || !endDate) return

        if (endDate.getTime() - startDate.getTime() < 5 * 60 * 1000) {
            console.log(endDate)
            console.log(startDate)
            console.log((endDate.getTime() - startDate.getTime())/(1000*60))
            toast.error("Session must be at least 5 minutes long")
            return
        }

        updateSessionMutation.mutate({
            labId,
            id,
            startAt: startDate,
            endAt: endDate,
        },
        {
            onSuccess: () => {
                toast.success("Session successfully edited")
                refetch()
            },
            onError: (error) => {
                toast.error(error.message)
            }
        })
    }

    const removeSession = (id: string) => {
        setBooking(null)
        if (!id) return

        removeSessionMutation.mutate({
            id,
        },
        {
            onSuccess: () => {
                toast.success("Session successfully removed")
                refetch()
            }
        })
    }

    useEffect(() => {
        setDate(new Date())

        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                setBooking(null)
                setEquipment(null)
            }
        })
    }, [])

    useEffect(() => {
        refetch()
        setStartDate(new Date(date!))
        setEndDate(new Date(date!))
    }, [date])


    return (
        <div className='flex justify-center gap-20 p-10 h-full'>
            <Calendar
            mode='single'
            selected={date}
            onSelect={setDate}
            />
            <div className='flex flex-col gap-4 items-center'>
                <div className='font-semibold text-lg'>
                    <span>{date?.toDateString()}</span>
                </div>
                <div className='max-h-full w-84 overflow-y-auto p-3 flex flex-col gap-2 rounded-lg bg-gray-800'>
                    <div className={`flex items-center ${isTeacher === true ? "justify-between" : "justify-center"}`}>
                        <div className='text-white font-semibold text-xl pl-2'>Sessions</div>
                        {isTeacher === true && 
                            <Popover open={isPopupOpenAdd} onOpenChange={setIsPopupOpenAdd}>
                                <PopoverTrigger asChild><Button variant={theme === "dark" ? "default" : "secondary"}>+ Add Session</Button></PopoverTrigger>
                                <PopoverContent>
                                    <h3 className='mb-1'>Start Time:</h3>
                                    <Input
                                    type="time"
                                    defaultValue={new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                                    onChange={(e) => {
                                        const newStart = new Date(date!)
                                        newStart.setHours(Number(e.target.value.slice(0, 2)), Number(e.target.value.slice(3, 5)), 0, 0)
                                        setStartDate(newStart)
                                    }}
                                    />
                                    <h3 className='mt-3 mb-1'>End Time:</h3>
                                    <Input
                                    type="time"
                                    defaultValue={new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                                    onChange={(e) => {
                                        const newEnd = new Date(date!)
                                        newEnd.setHours(Number(e.target.value.slice(0, 2)), Number(e.target.value.slice(3, 5)), 0, 0)
                                        setEndDate(newEnd)
                                    }}
                                    />
                                    <Button className='w-full mt-5' onClick={createSession}>Create</Button>
                                </PopoverContent>
                            </Popover>
                        }
                    </div>
                    {data?.length === 0 && <div className='flex justify-center  mt-2'>
                        <div className='text-gray-400'>No sessions found this  day</div>
                    </div>}
                    {data?.map(sess => (
                        <div key={sess.id}>
                            <div className='flex flex-col'>
                                <div className={`bg-gray-800 rounded-lg w-full text-center border-2 border-gray-600 relative p-1 ${(booking === sess.id || equipment === sess.id) && "outline-blue"}`}>
                                    <div className='text-white font-semibold pt-2 mb-1 text-lg'>{new Date(sess.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(sess.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className='text-gray-400'>Capacity: {sess.capacity}</div>
                                    <div className='text-gray-400'>Created by: {sess.createdBy.firstName} {sess.createdBy.lastName}</div>
                                    <div className="flex flex-wrap h-full gap-2 p-2 mt-2">
                                        {booking !== sess.id ?
                                            <Button className='flex-1'
                                             variant={theme === "dark" ? "default" : "secondary"}
                                             onClick={() => {
                                                setEquipment(null)
                                                setBooking(sess.id)
                                                toast("Press esc to cancel booking")
                                            }}>Book</Button>
                                        :<Button className='flex-1' onClick={() => setBooking(null)} variant={theme === "dark" ? "default" : "secondary"}>Cancel</Button>
                                        }
                                        {equipment !== sess.id ?
                                            <Button className='flex-1'
                                             variant={theme === "dark" ? "default" : "secondary"}
                                             onClick={() => {
                                                setBooking(null)
                                                setEquipment(sess.id)
                                                toast("Press esc to cancel session equipment selection")
                                            }}>Equipment</Button>
                                        :<Button className='flex-1' onClick={() => setEquipment(null)} variant={theme === "dark" ? "default" : "secondary"}>Cancel</Button>
                                        }
                                        {sess.createdBy.id === userId && isTeacher && <>
                                            <Dialog>
                                                <DialogTrigger asChild><Button className='flex-1' variant={theme === "dark" ? "default" : "secondary"}>Remove</Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader className='flex text-center items-center'>
                                                        <DialogTitle>Are you sure you want to remove this session?</DialogTitle>
                                                        <div className="flex gap-2 mt-5 w-full">
                                                            <DialogClose className='flex-1' asChild>
                                                                <Button variant="destructive" className="flex-1" onClick={() => removeSession(sess.id)}>Remove</Button>
                                                            </DialogClose>
                                                            <DialogClose className='flex-1' asChild>
                                                                <Button variant="secondary">Cancel</Button>
                                                            </DialogClose>
                                                        </div>
                                                    </DialogHeader>
                                                </DialogContent>
                                            </Dialog>
                                            <Dialog>
                                                <DialogTrigger asChild><Button className='flex-1' variant={theme === "dark" ? "default" : "secondary"}>Edit</Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader className='flex text-center items-center'>
                                                        <DialogTitle className='mb-2'>Edit Session</DialogTitle>
                                                        <div className='text-center'>
                                                            <h3 className='mb-1'>Start Time:</h3>
                                                            <Input
                                                            type="time"
                                                            defaultValue={new Date(sess.startAt).toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                                                            onChange={(e) => {
                                                                const date = new Date(sess.startAt)
                                                                date.setHours(Number(e.target.value.slice(0, 2)), Number(e.target.value.slice(3, 5)), 0, 0)
                                                                setStartDate(date)
                                                            }}
                                                            />
                                                            <h3 className='mt-3 mb-1'>End Time:</h3>
                                                            <Input
                                                            type="time"
                                                            defaultValue={new Date(sess.endAt).toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                                                            onChange={(e) => {
                                                                const date = new Date(sess.endAt)
                                                                date.setHours(Number(e.target.value.slice(0, 2)), Number(e.target.value.slice(3, 5)), 0, 0)
                                                                setEndDate(date)
                                                            }}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 mt-5 w-full">
                                                            <DialogClose className='flex-1' asChild>
                                                                <Button className="flex-1" onClick={() => updateSession(sess.id)}>Edit</Button>
                                                            </DialogClose>
                                                            <DialogClose className='flex-1' asChild>
                                                                <Button variant="secondary">Cancel</Button>
                                                            </DialogClose>
                                                        </div>
                                                    </DialogHeader>
                                                </DialogContent>
                                            </Dialog>
                                        </>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default CalendarPicker
