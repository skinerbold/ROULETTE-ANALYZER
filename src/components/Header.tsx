'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, Settings, LogOut, PlusCircle, Bell, X, Trash2 } from 'lucide-react'

// Interface para notificações
export interface Notification {
  id: string
  type: 'max-red' | 'max-green' | 'info'
  message: string
  rouletteName: string
  strategyName: string
  strategyNumbers: number[]
  timestamp: Date
  read: boolean
}

interface HeaderProps {
  user: any
  onLogout: () => void
  onEditProfile: () => void
  onCreateStrategy: () => void
  notifications?: Notification[]
  onClearNotifications?: () => void
  onMarkAllRead?: () => void
  onRemoveNotification?: (id: string) => void
}

export default function Header({ 
  user, 
  onLogout, 
  onEditProfile, 
  onCreateStrategy,
  notifications = [],
  onClearNotifications,
  onMarkAllRead,
  onRemoveNotification
}: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = async () => {
    localStorage.removeItem('user')
    onLogout()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

        <div className="flex items-center gap-2">
          {/* Ícone de Notificações (Sino) */}
          <div className="relative">
            <Button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowMenu(false)
                if (onMarkAllRead && !showNotifications) {
                  onMarkAllRead()
                }
              }}
              variant="ghost"
              className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Dropdown de Notificações */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-white">Notificações</span>
                    {notifications.length > 0 && (
                      <span className="text-xs text-gray-400">({notifications.length})</span>
                    )}
                  </div>
                  {notifications.length > 0 && onClearNotifications && (
                    <button
                      onClick={onClearNotifications}
                      className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpar
                    </button>
                  )}
                </div>
                
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma notificação</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-700/50 transition-colors ${
                            !notification.read ? 'bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${
                                  notification.type === 'max-red' ? 'bg-red-500' : 
                                  notification.type === 'max-green' ? 'bg-green-500' : 'bg-blue-500'
                                }`} />
                                <span className="text-xs text-gray-400">{formatTime(notification.timestamp)}</span>
                              </div>
                              <p className="text-sm text-white font-medium leading-tight">
                                {notification.type === 'max-red' ? '🔴 Máximo RED atingido!' : 
                                 notification.type === 'max-green' ? '🟢 Máximo GREEN atingido!' : 'ℹ️ Info'}
                              </p>
                              <p className="text-xs text-gray-300 mt-1">
                                <span className="text-blue-400">Roleta:</span> {notification.rouletteName}
                              </p>
                              <p className="text-xs text-gray-300">
                                <span className="text-purple-400">Estratégia:</span> {notification.strategyName}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                <span className="text-yellow-400">Números:</span> [{notification.strategyNumbers.slice(0, 6).join(', ')}{notification.strategyNumbers.length > 6 ? '...' : ''}]
                              </p>
                            </div>
                            {onRemoveNotification && (
                              <button
                                onClick={() => onRemoveNotification(notification.id)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                title="Remover notificação"
                                aria-label="Remover notificação"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Menu do Usuário */}
          <div className="relative">
            <Button
              onClick={() => {
                setShowMenu(!showMenu)
                setShowNotifications(false)
              }}
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
                
                <button
                  onClick={() => {
                    onCreateStrategy()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-base text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200 group"
                >
                  <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Cadastrar Estratégia</span>
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
      </div>
    </header>
  )
}