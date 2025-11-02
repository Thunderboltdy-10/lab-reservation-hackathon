"use client"
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api, type RouterOutputs } from '@/trpc/react'
import { useAuth } from '@clerk/nextjs'
import { DeleteIcon, PencilIcon, Trash2, Trash2Icon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

const RoleEntry = ({account, changedIds, setChangedIds}: {account: RouterOutputs["account"]["getAccounts"][number], changedIds: {id: string, role: "ADMIN" | "TEACHER" | "STUDENT"}[], setChangedIds: React.Dispatch<React.SetStateAction<{id: string, role: "ADMIN" | "TEACHER" | "STUDENT"}[]>>}) => {
    const {userId} = useAuth()
    const [role, setRole] = useState(account.role)

    const deleteAccountMutation = api.account.deleteAccount.useMutation()

    const changeRole = (val: "ADMIN" | "TEACHER" | "STUDENT") => {
        setRole(val)

        setChangedIds((prev) => {
            const existingIndex = prev.findIndex(item => item.id === account.id)
            
            if (val === account.role) {
                if (existingIndex !== -1) return prev.filter(item => item.id !== account.id)
                else return prev
            } else {
                if (existingIndex !== -1) {
                    return prev.map((item, index) => index === existingIndex ? {...item, role: val} : item)
                } else {
                    return [...prev, {id: account.id, role: val}]
                }
            }
        })
    }

    const deleteAccount = (id: string) => {
        deleteAccountMutation.mutate({
            id
        }, {
            onSuccess: () => {
                toast.success("Account successfully deleted")
            },
            onError: (error) => {
                toast.error("Error deleting account")
            }
        })
    }

    useEffect(() => {
        if (changedIds.length === 0) setRole(account.role)
    }, [changedIds])

    return (
        <div>
            <div className="gap-2 p-2 grid grid-cols-[1fr_1fr_1fr_auto] text-center hover:bg-gray-800">
                <div className='text-white'>{account.firstName} {account.lastName} {account.id === userId ? "(You)" : ""}</div>
                <div className='text-white'>{account.email}</div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center justify-center gap-2 cursor-pointer">
                            <p className="pl-7 text-center text-white">{role}</p>
                            <PencilIcon className="w-5 h-5 text-gray-400 hover:text-gray-200" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='bg-gray-900 border-2 border-gray-700 rounded-2xl'>
                        <DropdownMenuRadioGroup value={role} onValueChange={(val: string) => changeRole(val as "ADMIN" | "TEACHER" | "STUDENT")}>
                            <DropdownMenuRadioItem value="ADMIN" className='hover:!bg-gray-800 cursor-pointer !text-white'>ADMIN</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="TEACHER" className='hover:!bg-gray-800 cursor-pointer !text-white'>TEACHER</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="STUDENT" className='hover:!bg-gray-800 cursor-pointer !text-white'>STUDENT</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Dialog>
                    <DialogTrigger asChild><Trash2Icon className="w-5 h-5 mx-2 text-gray-400 hover:text-red-400 cursor-pointer" /></DialogTrigger>
                    <DialogContent>
                        <DialogHeader className='flex text-center items-center'>
                            <DialogTitle>Are you sure you want to permanently delete this account?</DialogTitle>
                            <div className="flex gap-2 mt-5 w-full">
                                <DialogClose className='flex-1' asChild>
                                    <Button variant="destructive" className="flex-1" onClick={() => deleteAccount(account.id)}>Remove</Button>
                                </DialogClose>
                                <DialogClose className='flex-1' asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </DialogClose>
                            </div>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
                
            </div>
        </div>
    )
}

export default RoleEntry