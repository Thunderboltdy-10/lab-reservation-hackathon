import { db } from "@/server/db"
import { createTRPCRouter, privateProcedure } from "../trpc"
import z from "zod"
import { TRPCError } from "@trpc/server"

export const authoriseAccountAccess = async (accountId: string, userId: string) => {
    const account = await db.user.findFirst({
        where: {
            id: accountId,
        }, select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        }
    })

    if (!account) throw new Error("Account not found")
    return account
}

export const accountRouter = createTRPCRouter({
    getAccount: privateProcedure.query(async ({ctx}) => {
        const user = await ctx.db.user.findUnique({
            where: {
                id: ctx.auth.userId
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            }
        })

        if (!user) throw new TRPCError({code: "NOT_FOUND", message:"User not found"})
        return user
    }),
    getAccounts: privateProcedure.query(async ({ctx}) => {
        return  await ctx.db.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
            orderBy: {
                role: "asc"
            }
        })
    }),
    updateAccounts: privateProcedure.input(z.object({
        accounts: z.array(z.object({
            id: z.string(),
            role: z.enum(["ADMIN", "TEACHER", "STUDENT"])
        }))
    })).mutation(async ({ctx, input}) => {
        for (const account of input.accounts) {
            await ctx.db.user.update({
                where: {
                    id: account.id
                },
                data: {
                    role: account.role
                }
            })
        }
    }),
    deleteAccount: privateProcedure.input(z.object({
        id: z.string()
    })).mutation(async ({ctx, input}) => {
        const booking = await ctx.db.seatBooking.deleteMany({where: {userId: input.id}})
        const session = await ctx.db.session.deleteMany({where: {createdById: input.id}})
        
        return await ctx.db.user.delete({where: {id: input.id}})
    }),
    getLabId: privateProcedure.input(z.object({
        lab: z.string()
    })).query(async ({ctx, input}) => {
        const lab = await ctx.db.lab.findFirst({
            where: {
                name: {
                    contains: input.lab,
                    mode: "insensitive"
                }
            },
            select: {
                id: true
            }
        })

        if (!lab) throw new TRPCError({code: "NOT_FOUND", message:"Lab not found"})
        return lab.id
    }),
    getSession: privateProcedure.input(z.object({
        labId: z.string(),
        date: z.date().optional()
    })).query(async({ctx, input}) => {
        if (!input.date) return []

        const nextDay = new Date(input.date.getTime() + 24 * 60 * 60 * 1000)

        const sessions = await ctx.db.session.findMany({
            where: {
                labId: input.labId,
                startAt: {
                    gte: input.date,
                    lt: nextDay
                }
            },
            select: {
                id: true,
                startAt: true,
                endAt: true,
                capacity: true,
                createdBy: true,
            },
            orderBy: {
                startAt: "asc"
            }
        })

        if (sessions.length === 0) return []
        return sessions
    }),
    getSessionAll: privateProcedure.input(z.object({
        date: z.date().optional()
    })).query(async({ctx, input}) => {
        if (!input.date) return []

        const nextDay = new Date(input.date.getTime() + 24 * 60 * 60 * 1000)

        const sessions = await ctx.db.session.findMany({
            where: {
                startAt: {
                    gte: input.date,
                    lt: nextDay
                }
            },
            select: {
                id: true,
                startAt: true,
                endAt: true,
                capacity: true,
                createdBy: true,
                lab: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                startAt: "asc"
            }
        })

        if (sessions.length === 0) return []
        return sessions
    }),
    createSession: privateProcedure.input(z.object({
        labId: z.string(),
        startAt: z.date(),
        endAt: z.date(),
    })).mutation(async ({ctx, input}) => {
        const overlap = await ctx.db.session.findFirst({
            where: {
                labId: input.labId,
                AND: [
                    {startAt: {lte: input.endAt}},
                    {endAt: {gte: input.startAt}}
                ]
            },
            select: {id: true}
        })

        if (overlap) {
            throw new TRPCError({code: "CONFLICT", message: "Session overlaps with an existing session"})
        }

        return await ctx.db.session.create({
            data: {
                labId: input.labId,
                startAt: input.startAt,
                endAt: input.endAt,
                capacity: 10,
                createdById: ctx.auth.userId
            }
        })
    }),
    updateSession: privateProcedure.input(z.object({
        labId: z.string(),
        id: z.string(),
        startAt: z.date(),
        endAt: z.date()
    })).mutation(async ({ctx, input}) => {
        const overlap = await ctx.db.session.findFirst({
            where: {
                labId: input.labId,
                AND: [
                    {startAt: {lte: input.endAt}},
                    {endAt: {gte: input.startAt}},
                    {NOT: {id: input.id}}
                ]
            },
            select: {id: true}
        })

        if (overlap) {
            throw new TRPCError({code: "CONFLICT", message: "Session overlaps with an existing session"})
        }

        return await ctx.db.session.update({
            where: {
                id: input.id,
                createdById: ctx.auth.userId
            },
            data: {
                startAt: input.startAt,
                endAt: input.endAt
            }
        })
    }),
    removeSession: privateProcedure.input(z.object({
        id: z.string(),
    })).mutation(async ({ctx, input}) => {
        const seatBookings = await ctx.db.seatBooking.findMany({
            where: {
                sessionId: input.id
            }
        })

        for (const seatBooking of seatBookings) {
            await ctx.db.seatBooking.delete({
                where: {
                    id: seatBooking.id
                }
            })
        }

        return await ctx.db.session.delete({
            where: {
                id: input.id,
                createdById: ctx.auth.userId
            }
        })
    }),
    getSeatIds: privateProcedure.input(z.object({
        labId: z.string()
    })).query(async ({ctx, input}) => {
        return await ctx.db.seat.findMany({
            where: {
                labId: input.labId
            },
            select: {
                id: true
            },
            orderBy: [
                { row: "asc" },
                { col: "asc" },
            ]
        })
    }),
    getOccupiedSeats: privateProcedure.input(z.object({
        labId: z.string(),
        sessionId: z.string()
    })).query(async ({ctx, input}) => {
        const seats = await ctx.db.seat.findMany({
            where: {
                labId: input.labId
            }
        })

        if (seats.length === 0) return []

        return await ctx.db.seatBooking.findMany({
            where: {
                seatId: {
                    in: seats.map(seat => seat.id)
                },
                sessionId: input.sessionId
            },
            select: {
                id: true,
                seatId: true,
                sessionId: true,
                userId: true,
                name: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        })
    }),
    bookSeat: privateProcedure.input(z.object({
        name: z.string(),
        sessionId: z.string(),
        labId: z.string()
    })).mutation(async ({ctx, input}) => {
        const seatId = await ctx.db.seat.findFirst({
            where: {
                labId: input.labId,
                name: input.name
            },
            select: {
                id: true
            }
        })

        if (!seatId) throw new Error("Seat not found")

        const capacity = await ctx.db.session.updateMany({
            where: {
                id: input.sessionId
            },
            data: {
                capacity: {
                    decrement: 1
                }
            }
        })

        return await ctx.db.seatBooking.create({
            data: {
                sessionId: input.sessionId,
                seatId: seatId.id,
                userId: ctx.auth.userId,
                name: input.name
            }
        })
    }),
    unbookSeat: privateProcedure.input(z.object({
        name: z.string(),
        sessionId: z.string(),
        labId: z.string(),
        isTeacher: z.boolean()
    })).mutation(async ({ctx, input}) => {
        const seatId = await ctx.db.seat.findFirst({
            where: {
                labId: input.labId,
                name: input.name
            },
            select: {
                id: true
            }
        })

        if (!seatId) throw new Error("Seat not found")

        const capacity = await ctx.db.session.updateMany({
            where: {
                id: input.sessionId
            },
            data: {
                capacity: {
                    increment: 1
                }
            }
        })

        return await ctx.db.seatBooking.deleteMany({
            where: {
                sessionId: input.sessionId,
                seatId: seatId.id,
                name: input.name,
                ...(input.isTeacher ? {} : {userId: ctx.auth.userId})
            }
        })
    }),
    addLabEquipment: privateProcedure.input(z.object({
        labId: z.string(),
        name: z.string(),
        total: z.number()
    })).mutation(async ({ctx, input}) => {
        return await ctx.db.equipment.create({
            data: {
                labId: input.labId,
                name: input.name,
                total: input.total
            }
        })
    }),
    getLabEquipment: privateProcedure.input(z.object({
        labId: z.string()
    })).query(async ({ctx, input}) => {
        return await ctx.db.equipment.findMany({
            where: {
                labId: input.labId
            },
            select: {
                id: true,
                name: true,
                total: true
            },
            orderBy: {
                total: "desc"
            }
        })
    }),
    deleteLabEquipment: privateProcedure.input(z.object({
        id: z.string()
    })).mutation(async ({ctx, input}) => {
        return await ctx.db.equipment.delete({
            where: {
                id: input.id
            }
        })
    }),
    updateLabEquipment: privateProcedure.input(z.object({
        id: z.string(),
        name: z.string().optional(),
        total: z.number().optional()
    })).mutation(async ({ctx, input}) => {
        return await ctx.db.equipment.update({
            where: {
                id: input.id
            },
            data: {
                name: input.name,
                total: input.total
            }
        })
    }),
    getSessionEquipment: privateProcedure.input(z.object({
        sessionId: z.string()
    })).query(async ({ctx, input}) => {
        return await ctx.db.sessionEquipment.findMany({
            where: {
                sessionId: input.sessionId
            },
            select: {
                id: true,
                equipmentId: true,
                equipment: {
                    select: {
                        id: true,
                        name: true,
                        total: true
                    }
                },
                available: true
            }
        })
    }),
    updateSessionEquipment: privateProcedure.input(z.object({
        sessionId: z.string(),
        deletedEq: z.object({
            id: z.string(),
            available: z.number()
        }).array(),
        addedEq: z.object({
            id: z.string(),
            available: z.number()
        }).array(),
        updatedEq: z.object({
            id: z.string(),
            available: z.number()
        }).array()
    })).mutation(async ({ctx, input}) => {
        const deleteEq = await ctx.db.sessionEquipment.deleteMany({
            where: {
                sessionId: input.sessionId,
                equipmentId: {
                    in: input.deletedEq.map(eq => eq.id)
                }
            }
        })

        for (const eq of input.updatedEq) {
            await ctx.db.sessionEquipment.update({
                where: {
                    sessionId_equipmentId: {
                        sessionId: input.sessionId,
                        equipmentId: eq.id
                    }
                },
                data: {
                    available: eq.available
                }
            })
        }


        const addEq = await ctx.db.sessionEquipment.createMany({
            data: input.addedEq.map(eq => ({
                sessionId: input.sessionId,
                equipmentId: eq.id,
                available: eq.available
            }))
        })
    })
})  