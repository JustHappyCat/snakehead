'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Activity, 
  Search, 
  FileText, 
  Link2, 
  Gauge, 
  Map, 
  Download, 
  Settings, 
  BookOpen,
  ChevronRight,
  RefreshCw,
  Plus
} from 'lucide-react'

const navigation = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Site Health', href: '/health', icon: Activity },
  { name: 'Indexing', href: '/indexing', icon: Search },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Links', href: '/links', icon: Link2 },
  { name: 'Performance', href: '/performance', icon: Gauge },
  { name: 'Sitemaps', href: '/sitemaps', icon: Map },
  { name: 'Exports', href: '/exports', icon: Download },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Glossary', href: '/glossary', icon: BookOpen },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Link href="/" className="text-xl font-bold flex items-center gap-3">
            <Image
              src="/branding/snakehead-logo.png"
              alt="snakehead"
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm object-contain"
            />
            snakehead
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                      transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            System online
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select className="border rounded-md px-3 py-1.5 text-sm bg-background">
              <option>No crawl selected</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded">
              Beginner mode is on
            </span>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Crawl
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
