"use client";
import {
	Bell,
	Book,
	CheckCheck,
	ChevronDown,
	ClipboardCheck,
	FlaskConical,
	Home,
	Menu,
	MoonIcon,
	Package,
	SunIcon,
	User,
	Users,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/trpc/react";
import { UserButton } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const notificationTypeLabel: Record<string, string> = {
	SESSION_REMINDER: "Session Reminder",
	BOOKING_CONFIRMED: "Booking Confirmed",
	BOOKING_APPROVED: "Booking Approved",
	BOOKING_REJECTED: "Booking Rejected",
	BOOKING_CANCELLED: "Booking Cancelled",
	ATTENDANCE_NEEDED: "Attendance Required",
	USAGE_REPORT_NEEDED: "Usage Report Due",
	EQUIPMENT_LOW_STOCK: "Low Stock Alert",
	USAGE_CORRECTED: "Usage Corrected",
};

function NotificationBell({ compact = false }: { compact?: boolean }) {
	const utils = api.useUtils();
	const router = useRouter();
	const { data: unreadData, refetch } = api.notifications.getUnreadCount.useQuery(undefined, {
		refetchInterval: 60000, // Poll every minute
	});
	const { data: notifications } = api.notifications.getAll.useQuery({ take: 15 });
	const markAllRead = api.notifications.markAllRead.useMutation({
		onSuccess: () => {
			utils.notifications.getUnreadCount.invalidate();
			utils.notifications.getAll.invalidate();
		},
	});
	const markRead = api.notifications.markRead.useMutation({
		onSuccess: () => {
			utils.notifications.getUnreadCount.invalidate();
			utils.notifications.getAll.invalidate();
		},
	});

	const unreadCount = unreadData?.count ?? 0;

	const handleOpen = (open: boolean) => {
		if (!open && unreadCount > 0) {
			markAllRead.mutate();
		}
	};

	return (
			<Popover onOpenChange={handleOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="relative"
						title="Notifications"
						aria-label="Notifications"
					>
						<Bell className="h-5 w-5" />
						{unreadCount > 0 && (
						<span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				side={compact ? "top" : "right"}
				align="end"
				className="w-80 p-0 rounded-2xl shadow-xl"
			>
				<div className="flex items-center justify-between border-b px-4 py-3">
					<span className="font-semibold text-sm">Notifications</span>
					{unreadCount > 0 && (
						<button
							type="button"
							onClick={() => markAllRead.mutate()}
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							<CheckCheck className="h-3.5 w-3.5" />
							Mark all read
						</button>
					)}
				</div>
				<div className="max-h-96 overflow-y-auto divide-y divide-border/40">
					{!notifications || notifications.length === 0 ? (
						<div className="py-10 text-center text-sm text-muted-foreground">
							<Bell className="mx-auto mb-2 h-6 w-6 opacity-30" />
							No notifications yet
						</div>
					) : (
						notifications.map((n) => (
								<button
									type="button"
									key={n.id}
									onClick={async () => {
										if (!n.read) {
											try {
												await markRead.mutateAsync({ id: n.id });
											} catch {
												// Non-fatal for navigation.
											}
										}

										if (!n.link) return;
										if (n.link.startsWith("/")) {
											router.push(n.link);
											return;
										}
										window.location.href = n.link;
									}}
									className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${n.read ? "opacity-60" : ""}`}
							>
								<div className="flex items-start gap-2">
									{!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
									{n.read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5 mb-0.5">
											<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												{notificationTypeLabel[n.type] ?? n.type}
											</span>
										</div>
										<p className="text-xs font-medium leading-snug">{n.title}</p>
										<p className="text-xs text-muted-foreground leading-snug mt-0.5">{n.message}</p>
										<p className="text-[10px] text-muted-foreground mt-1">
											{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
										</p>
									</div>
								</div>
							</button>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

const items = [
	{
		title: "Dashboard",
		url: "/",
		icon: Home,
		show: ["STUDENT", "TEACHER", "ADMIN"],
	},
	{
		title: "Book Lab",
		url: "/book",
		icon: Book,
		show: ["STUDENT", "ADMIN"],
		children: [
			{
				title: "Physics/Chemistry",
				url: "/book/physics",
				show: ["STUDENT", "ADMIN"],
			},
			{ title: "Biology", url: "/book/biology", show: ["STUDENT", "ADMIN"] },
		],
	},
	{
		title: "Labs",
		url: "/lab",
		icon: FlaskConical,
		show: ["ADMIN", "TEACHER"],
		children: [
			{
				title: "Physics/Chemistry",
				url: "/lab/physics",
				show: ["TEACHER", "ADMIN"],
			},
			{ title: "Biology", url: "/lab/biology", show: ["TEACHER", "ADMIN"] },
		],
	},
	{
		title: "Attendance",
		url: "/attendance",
		icon: ClipboardCheck,
		show: ["TEACHER", "ADMIN"],
	},
	{
		title: "Equipment",
		url: "/equipment",
		icon: Package,
		show: ["TEACHER", "ADMIN"],
	},
	{
		title: "Students",
		url: "/students",
		icon: Users,
		show: ["TEACHER", "ADMIN"],
	},
	{
		title: "Roles",
		url: "/roles",
		icon: User,
		show: ["ADMIN"],
	},
];

// Mobile navigation component
function MobileNav({ role }: { role: string | undefined }) {
	const { theme, setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="fixed top-4 left-4 z-50 md:hidden"
				>
					<Menu className="h-6 w-6" />
					<span className="sr-only">Toggle menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 p-0">
				<SheetHeader className="border-b p-4">
					<SheetTitle className="flex flex-col items-center gap-2 text-center">
						<Image
							src="/logo.png"
							alt="TGC"
							width={84}
							height={84}
							className="rounded-md"
							priority
						/>
						<div>
							<div className="font-semibold text-lg">TGC Labs</div>
							<div className="text-muted-foreground text-xs">
								Lab Reservation
							</div>
						</div>
					</SheetTitle>
				</SheetHeader>
				<nav className="flex flex-col gap-1 p-4">
					{items.map((item) => {
						if (!item.show.includes(role ?? "")) return null;
						const isActive =
							pathname === item.url || pathname.startsWith(`${item.url}/`);

						if (item.children) {
							return (
								<Collapsible key={item.title} defaultOpen={isActive}>
									<CollapsibleTrigger asChild>
										<button
											type="button"
											className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
												isActive
													? "bg-primary text-primary-foreground"
													: "hover:bg-muted"
											}`}
										>
											<span className="flex items-center gap-2">
												<item.icon className="h-4 w-4" />
												{item.title}
											</span>
											<ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
										</button>
									</CollapsibleTrigger>
									<CollapsibleContent className="mt-1 ml-4 space-y-1">
										{item.children.map((child) => {
											if (!child.show.includes(role ?? "")) return null;
											const childActive = pathname === child.url;
											return (
												<Link
													key={child.url}
													href={child.url}
													onClick={() => setOpen(false)}
													className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
														childActive
															? "bg-primary text-primary-foreground"
															: "hover:bg-muted"
													}`}
												>
													{child.title}
												</Link>
											);
										})}
									</CollapsibleContent>
								</Collapsible>
							);
						}

						return (
							<Link
								key={item.url}
								href={item.url}
								onClick={() => setOpen(false)}
								className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
									isActive
										? "bg-primary text-primary-foreground"
										: "hover:bg-muted"
								}`}
							>
								<item.icon className="h-4 w-4" />
								{item.title}
							</Link>
						);
					})}
				</nav>
				<div className="absolute right-0 bottom-0 left-0 border-t p-4">
					<div className="flex items-center justify-between">
						<UserButton />
						<NotificationBell compact />
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setTheme(theme === "light" ? "dark" : "light")}
						>
							{theme === "light" ? (
								<MoonIcon className="h-5 w-5" />
							) : (
								<SunIcon className="h-5 w-5" />
							)}
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export function AppSidebar() {
	const { state } = useSidebar();
	const { theme, setTheme } = useTheme();
	const [currentTab, setCurrentTab] = useState<string>("");
	const [isMobile, setIsMobile] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const { data } = api.account.getAccount.useQuery();

	const pathname = usePathname();

	const activeUrl = useMemo(() => {
		for (const item of items) {
			if (pathname === item.url) return item.url;
			for (const child of item.children ?? []) {
				if (pathname === child.url) return child.url;
			}
		}
		return "";
	}, [pathname]);

	useEffect(() => {
		if (activeUrl) setCurrentTab(activeUrl);
	}, [activeUrl]);

	// Check for mobile viewport
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Render mobile navigation on small screens
	if (isMobile) {
		return <MobileNav role={data?.role} />;
	}

	return (
		<Sidebar collapsible="icon">
			<SidebarContent>
				<SidebarHeader>
					<div className="mt-2 flex items-start">
						{state === "expanded" ? (
							<div className="ml-2 flex flex-1 flex-col items-center gap-2 text-center">
								<Image
									src="/logo.png"
									alt="TGC"
									width={150}
									height={150}
									className="rounded-md dark:brightness-[5] dark:grayscale"
									priority
								/>
								<div>
									<div className="font-semibold text-lg">TGC Labs</div>
									<div className="text-muted-foreground text-xs">
										Lab Reservation
									</div>
								</div>
							</div>
						) : (
							<div className="ml-2 flex items-center">
								<Image
									src="/logo.png"
									alt="TGC"
									width={60}
									height={60}
									className="rounded-md dark:brightness-[5] dark:grayscale"
								/>
							</div>
						)}
						<div className="ml-auto">
							<SidebarTrigger />
						</div>
					</div>
				</SidebarHeader>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => {
								if (!item.show.includes(data?.role ?? "")) return null;
								const hasChildren = (item.children?.length ?? 0) > 0;

								const content = (
									<SidebarMenuItem key={item.title}>
										{hasChildren ? (
											<>
												<SidebarMenuButton
													asChild
													className={`rounded-lg transition-colors ${
														item.url === currentTab
															? "bg-sidebar-accent text-sidebar-accent-foreground"
															: ""
													}`}
												>
													<div className="flex justify-between">
														<Link href={item.url} className="flex items-center">
															<item.icon className="h-4 w-4 flex-shrink-0" />
															<span className="ml-2">{item.title}</span>
														</Link>
														<CollapsibleTrigger asChild>
															<button
																type="button"
																title="Toggle"
																className="p-1 transition-transform duration-200 group-data-[state=open]:rotate-180"
															>
																<ChevronDown className="h-4 w-4" />
															</button>
														</CollapsibleTrigger>
													</div>
												</SidebarMenuButton>
												<CollapsibleContent>
													{item.children?.map((child) => {
														return (
															<SidebarMenuSub key={child.title}>
																<SidebarMenuSubItem>
																	<SidebarMenuButton
																		asChild
																		className={`rounded-lg transition-colors ${
																			child.url === currentTab
																				? "bg-sidebar-accent text-sidebar-accent-foreground"
																				: ""
																		}`}
																	>
																		<Link href={child.url}>
																			<span>{child.title}</span>
																		</Link>
																	</SidebarMenuButton>
																</SidebarMenuSubItem>
															</SidebarMenuSub>
														);
													})}
												</CollapsibleContent>
											</>
										) : (
											<SidebarMenuButton
												asChild
												className={`rounded-lg transition-colors ${
													item.url === currentTab
														? "bg-sidebar-accent text-sidebar-accent-foreground"
														: ""
												}`}
											>
												<Link href={item.url}>
													<item.icon className="h-4 w-4 flex-shrink-0" />
													<span>{item.title}</span>
												</Link>
											</SidebarMenuButton>
										)}
									</SidebarMenuItem>
								);

								return hasChildren ? (
									<Collapsible key={item.title} className="group/collapsible">
										{content}
									</Collapsible>
								) : (
									<div key={item.title}>{content}</div>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarFooter className="mt-auto">
					<div className="flex flex-col gap-2">
						{state === "expanded" ? (
							<>
								<Separator />
								<div className="flex items-center justify-start gap-2 px-4 py-2">
									<UserButton />
									<NotificationBell />
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											setTheme(theme === "light" ? "dark" : "light")
										}
										className="ml-auto transition-transform hover:scale-105"
									>
										{!mounted ? (
											<MoonIcon className="h-5 w-5" />
										) : theme === "light" ? (
											<MoonIcon className="h-5 w-5" />
										) : (
											<SunIcon className="h-5 w-5" />
										)}
									</Button>
								</div>
							</>
						) : (
							<>
								<Separator />
								<div className="flex flex-col items-start gap-2 px-2 py-2">
									<Button
										variant="ghost"
										size="icon"
										onClick={() =>
											setTheme(theme === "light" ? "dark" : "light")
										}
									>
										{!mounted ? (
											<MoonIcon className="h-5 w-5" />
										) : theme === "light" ? (
											<MoonIcon className="h-5 w-5" />
										) : (
											<SunIcon className="h-5 w-5" />
										)}
									</Button>
									<NotificationBell compact />
									<UserButton />
								</div>
							</>
						)}
					</div>
				</SidebarFooter>
			</SidebarContent>
		</Sidebar>
	);
}
