"use client"
import { User, FlaskConical, History, Home, Book, MoonIcon, Search, Settings, SunIcon, ChevronDown } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import Link from "next/link";

import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const items = [
    {
        title: "Dashboard",
        url: "/",
        icon: Home,
        show: ["STUDENT", "TEACHER", "ADMIN"]
    },
    {
        title: "Book Lab",
        url: "/book",
        icon: Book,
        show: ["STUDENT", "ADMIN"],
        children: [
            { title: "Physics/Chemistry", url: "/book/physics", show: ["STUDENT", "ADMIN"] },
            { title: "Biology", url: "/book/biology", show: ["STUDENT", "ADMIN"] },
        ]
    },
    {
        title: "Labs",
        url: "/lab",
        icon: FlaskConical,
        show: ["ADMIN", "TEACHER"],
        children: [
            { title: "Physics/Chemistry", url: "/lab/physics", show: ["TEACHER", "ADMIN"] },
            { title: "Biology", url: "/lab/biology", show: ["TEACHER", "ADMIN"] },
        ]
    },
    {
        title: "Roles",
        url: "/roles",
        icon: User,
        show: ["ADMIN"]
    },
]

export function AppSidebar() {
    const {state, toggleSidebar} = useSidebar()
    const {theme, setTheme} = useTheme()
    const [currentTab, setCurrentTab] = useState<string>("")

    const {data} = api.account.getAccount.useQuery()

    const  pathname = usePathname()

    const getURL = () => {
        for (const item of items) {
            if (pathname === item.url) return item.url
            for (const child of item.children ?? []) {
                if (pathname === child.url) return child.url
            }
        }
        return ""
    }

    useEffect(() => {
        const active = getURL()
        if (active) setCurrentTab(active)
    }, [pathname])

    return (
        <Sidebar collapsible="icon">
            <SidebarContent>
                <SidebarHeader>
                    <div className="flex mt-2">
                        {state === "expanded" && <>
                            <h1 className="text-lg ml-5">Global College Labs</h1>
                        </>}
                        <div className="ml-auto"><SidebarTrigger /></div>
                    </div>
                </SidebarHeader>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => {
                                if (!item.show.includes(data?.role ?? "")) return null
                                const hasChildren = (item.children?.length ?? 0) > 0

                                const content = (
                                    <>
                                        <SidebarMenuItem>
                                            {hasChildren ? (
                                                <>
                                                    <SidebarMenuButton asChild className={`rounded-lg ${item.url === currentTab ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}>
                                                        <div className="flex justify-between">
                                                            <Link href={item.url} className="flex items-center">
                                                                <item.icon className="h-4 w-4 flex-shrink-0" />
                                                                <span className="ml-2">{item.title}</span>
                                                            </Link>
                                                            <CollapsibleTrigger asChild>
                                                                <button type="button" title="Toggle" className="p-1 transition-transform group-data-[state=open]:rotate-180">
                                                                    <ChevronDown className="h-4 w-4" />
                                                                </button>
                                                            </CollapsibleTrigger>
                                                        </div>
                                                    </SidebarMenuButton>
                                                    <CollapsibleContent>
                                                    {item.children?.map(child => {
                                                        return (
                                                            <SidebarMenuSub key={child.title}>
                                                                <SidebarMenuSubItem>
                                                                    <SidebarMenuButton asChild className={`rounded-lg ${child.url === currentTab ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}>
                                                                        <Link href={child.url}>
                                                                            <span>{child.title}</span>
                                                                        </Link>
                                                                    </SidebarMenuButton>
                                                                </SidebarMenuSubItem>
                                                            </SidebarMenuSub>
                                                        )
                                                    })}
                                                    </CollapsibleContent>
                                                </>
                                            ) : (
                                                <SidebarMenuButton asChild className={`rounded-lg ${item.url === currentTab ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}>
                                                    <Link href={item.url}>
                                                        <item.icon className="h-4 w-4 flex-shrink-0" />
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            )}
                                        </SidebarMenuItem>
                                    </>
                                )
                                return hasChildren ? (
                                    <Collapsible key={item.title} className="group/collapsible">
                                        {content}
                                    </Collapsible>
                                ) : (
                                    <div key={item.title}>{content}</div>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarFooter className="mt-auto">
                    <div className="flex flex-col gap-2">
                        {state === "expanded" ? <>
                            <Separator />
                            <div className="flex justify-between mx-10">
                                <UserButton />
                                <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <MoonIcon /> : <SunIcon />}</Button>
                            </div>
                        </> : <>
                            <Separator />
                            <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <MoonIcon /> : <SunIcon />}</Button>
                            <UserButton />
                        </>}
                        
                    </div>
                </SidebarFooter>
            </SidebarContent>
        </Sidebar>
    )
}