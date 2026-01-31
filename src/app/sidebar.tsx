"use client";
import {
  User,
  FlaskConical,
  Home,
  Book,
  MoonIcon,
  SunIcon,
  ChevronDown,
  ClipboardCheck,
  Package,
  Users,
  Menu,
} from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import Image from "next/image";

import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
      { title: "Physics/Chemistry", url: "/book/physics", show: ["STUDENT", "ADMIN"] },
      { title: "Biology", url: "/book/biology", show: ["STUDENT", "ADMIN"] },
    ],
  },
  {
    title: "Labs",
    url: "/lab",
    icon: FlaskConical,
    show: ["ADMIN", "TEACHER"],
    children: [
      { title: "Physics/Chemistry", url: "/lab/physics", show: ["TEACHER", "ADMIN"] },
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
          className="fixed left-4 top-4 z-50 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="TGC"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="font-semibold">TGC Labs</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {items.map((item) => {
            if (!item.show.includes(role ?? "")) return null;
            const isActive = pathname === item.url || pathname.startsWith(item.url + "/");

            if (item.children) {
              return (
                <Collapsible key={item.title} defaultOpen={isActive}>
                  <CollapsibleTrigger asChild>
                    <button
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
                  <CollapsibleContent className="ml-4 mt-1 space-y-1">
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
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <div className="flex items-center justify-between">
            <UserButton />
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

  const { data } = api.account.getAccount.useQuery();

  const pathname = usePathname();

  const getURL = () => {
    for (const item of items) {
      if (pathname === item.url) return item.url;
      for (const child of item.children ?? []) {
        if (pathname === child.url) return child.url;
      }
    }
    return "";
  };

  useEffect(() => {
    const active = getURL();
    if (active) setCurrentTab(active);
  }, [pathname]);

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
          <div className="mt-2 flex items-center">
            {state === "expanded" && (
              <div className="ml-2 flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="TGC"
                  width={32}
                  height={32}
                  className="rounded"
                />
                <h1 className="font-semibold text-lg">TGC Labs</h1>
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
                <div className="mx-4 flex items-center justify-between py-2">
                  <UserButton />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="transition-transform hover:scale-105"
                  >
                    {theme === "light" ? (
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
                <div className="flex flex-col items-center gap-2 py-2">
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
