"use client"
import { Separator } from '@/components/ui/separator'
import { api } from '@/trpc/react'
import { PencilIcon } from 'lucide-react'
import React, { useState } from 'react'
import RoleEntry from '../_components/role'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'


const Roles = () => {
    const {data: accounts} = api.account.getAccounts.useQuery()
    const updateAccountsMutation = api.account.updateAccounts.useMutation()

    const [changedIds, setChangedIds] = useState<{id: string, role: "ADMIN" | "TEACHER" | "STUDENT"}[]>([])

    const updateAccounts = () => {
        updateAccountsMutation.mutate(
            {accounts: changedIds}, {
                onSuccess: () => {
                    toast.success(`Account${changedIds.length > 1 ? "s" : ""} successfully updated`)
                    setChangedIds([])
                },
                onError: (error) => {
                    toast.error(error.message)
                }
            }
        )
    }

    return (
        <div className='flex flex-col gap-5 items-center justify-center h-screen'>
            <h1 className='text-2xl font-bold'>Roles</h1>
            <div className='border-2 border-gray-700 rounded-2xl dark:bg-gray-900 bg-gray-500 shadow-xl overflow-hidden'>
                <div className='gap-2 py-3 grid grid-cols-[1fr_1fr_1fr_auto] text-center font-bold text-gray-200 bg-gray-800'>
                    <div>Name</div>
                    <div>Email</div>
                    <div>Role</div>
                </div>
                {accounts?.map((account, i) => (
                    <RoleEntry account={account} key={i} changedIds={changedIds} setChangedIds={setChangedIds} />
                ))}
                
            </div>
            {changedIds.length > 0 && <div className='flex gap-2'>
                <Button onClick={updateAccounts}>Save</Button>
                <Button variant="secondary" onClick={() => setChangedIds([])}>Cancel</Button>
            </div>}
        </div>
    )
}

export default Roles