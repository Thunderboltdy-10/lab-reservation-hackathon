import { api } from "@/trpc/react";

export default function useLab({lab}: {lab: string | null}) {

    const {data: labId} = api.account.getLabId.useQuery({
        lab: lab!
    }, {
        enabled: !!lab
    })

    return labId
}