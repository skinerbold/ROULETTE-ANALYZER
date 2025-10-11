'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { User, Settings, LogOut } from 'lucide-react'

interface HeaderProps {
  user: any
  onLogout: () => void
  onEditProfile: () => void
}

export default function Header({ user, onLogout, onEditProfile }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    localStorage.removeItem('user')
    onLogout()
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Roulette Analyzer</h1>
            <p className="text-xs text-gray-400">Análise de Estratégias</p>
          </div>
        </div>

        <div className="relative">
          <Button
            onClick={() => setShowMenu(!showMenu)}
            variant="ghost"
            className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-lg transition-all duration-200"
          >
            {/* Ícone do perfil MAIOR em ambos dispositivos */}
            <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
            <span className="hidden sm:inline text-sm md:text-base font-medium">{user.name}</span>
          </Button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-64 sm:w-72 md:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              {/* Header do menu com padding generoso */}
              <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-4">
                  {/* Avatar MAIOR no menu */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              
              {/* Menu de opções com padding generoso */}
              <div className="py-2">
                <button
                  onClick={() => {
                    onEditProfile()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-base text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-white transition-all duration-200 group"
                >
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Editar Perfil</span>
                </button>
                
                <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-600"></div>
                
                <button
                  onClick={() => {
                    handleLogout()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-base text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group"
                >
                  <LogOut className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}