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
import { isBookingAtom } from '@/lib/atoms'
import { useAuth } from '@clerk/nextjs'

const CalendarGeneral = () => {
    const [date, setDate] = React.useState<Date | undefined>(undefined)

    const {userId} = useAuth()

    const normalisedDate = useMemo(() => {
        if (!date) return undefined
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }, [date])

    const {data, refetch} = api.account.getSessionAll.useQuery({
        date: normalisedDate
    },{
        enabled: !!date,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    })

    useEffect(() => {
        setDate(new Date())
    }, [])

    useEffect(() => {
        refetch()
    }, [date])


    return (
        <div className='flex justify-center gap-20 m-10 h-3/4'>
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
                    <div className={`flex items-center justify-center`}>
                        <div className='text-white font-semibold text-xl pl-2'>Sessions</div>
                    </div>
                    {data?.length === 0 && <div className='flex justify-center  mt-2'>
                        <div className='text-gray-400'>No sessions found this  day</div>
                    </div>}
                    {data?.map(sess => (
                        <div key={sess.id}>
                            <div className='flex flex-col'>
                                <div className={`bg-gray-800 rounded-lg w-full text-center border-2 border-gray-600 relative cursor-pointer p-1`}>
                                    <div className='text-white font-semibold pt-2 mb-1 text-lg'>{new Date(sess.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(sess.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className='text-gray-300 font-semibold'>Room: {sess.lab.name}</div>
                                    <div className='text-gray-400'>Capacity: {sess.capacity}</div>
                                    <div className='text-gray-400'>Created by: {sess.createdBy.firstName} {sess.createdBy.lastName}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default CalendarGeneral
