'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckSquare, Square, Layers } from 'lucide-react'
import { StrategyFolder, ChipCategory } from '@/lib/strategies'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface FolderSelectorProps {
  folders: StrategyFolder[]
  chipCategory: ChipCategory
  selectedFolder: string
  selectedStrategies: number[] | 'all'
  onFolderChange: (folderName: string) => void
  onStrategiesChange: (strategyIds: number[] | 'all') => void
}

export default function FolderSelector({
  folders,
  chipCategory,
  selectedFolder,
  selectedStrategies,
  onFolderChange,
  onStrategiesChange
}: FolderSelectorProps) {
  const [expandedFolder, setExpandedFolder] = useState<string>(selectedFolder)

  const currentFolder = folders.find(f => f.name === selectedFolder)
  const isAllSelected = selectedStrategies === 'all'
  
  const toggleFolder = (folderName: string) => {
    if (expandedFolder === folderName) {
      setExpandedFolder('')
    } else {
      setExpandedFolder(folderName)
      onFolderChange(folderName)
    }
  }

  const toggleStrategy = (strategyId: number) => {
    if (isAllSelected) {
      // Se estava "all", muda para apenas esta estratégia
      onStrategiesChange([strategyId])
    } else {
      const currentIds = selectedStrategies as number[]
      if (currentIds.includes(strategyId)) {
        // Remove estratégia
        const newIds = currentIds.filter(id => id !== strategyId)
        if (newIds.length === 0) {
          onStrategiesChange('all')
        } else {
          onStrategiesChange(newIds)
        }
      } else {
        // Adiciona estratégia
        onStrategiesChange([...currentIds, strategyId])
      }
    }
  }

  const selectAllInFolder = () => {
    onStrategiesChange('all')
  }

  const isStrategySelected = (strategyId: number): boolean => {
    if (isAllSelected) return true
    return (selectedStrategies as number[]).includes(strategyId)
  }

  const getSelectedCount = (): number => {
    if (isAllSelected && currentFolder) {
      return currentFolder.strategies.length
    }
    return (selectedStrategies as number[]).length
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">
            {chipCategory === 'up-to-9' ? 'Até 9 Fichas' : 'Mais de 9 Fichas'}
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          {folders.length} pastas disponíveis
        </p>
      </div>

      {/* Folders List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {folders.map((folder) => {
            const isExpanded = expandedFolder === folder.name
            const isCurrent = selectedFolder === folder.name
            
            return (
              <div key={folder.name} className="space-y-1">
                {/* Folder Header */}
                <button
                  onClick={() => toggleFolder(folder.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-medium text-sm">{folder.name}</span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${isCurrent ? 'bg-blue-700' : 'bg-gray-600'}`}
                  >
                    {folder.strategies.length}
                  </Badge>
                </button>

                {/* Strategies List (Expanded) */}
                {isExpanded && isCurrent && (
                  <div className="ml-6 space-y-1 mt-2">
                    {/* Select All Button */}
                    <button
                      onClick={selectAllInFolder}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                        isAllSelected
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span className="font-medium">Todas ({folder.strategies.length})</span>
                    </button>

                    {/* Individual Strategies */}
                    {folder.strategies.map((strategy) => {
                      const selected = isStrategySelected(strategy.id)
                      
                      return (
                        <button
                          key={strategy.id}
                          onClick={() => toggleStrategy(strategy.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${
                            selected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {selected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                            <span>{strategy.name}</span>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${selected ? 'bg-blue-700' : 'bg-gray-600'}`}
                          >
                            {strategy.numbers.length}
                          </Badge>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="text-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Pasta Selecionada:</span>
            <span className="text-white font-medium">{selectedFolder}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Estratégias Ativas:</span>
            <span className={`font-bold ${isAllSelected ? 'text-green-400' : 'text-blue-400'}`}>
              {isAllSelected ? 'Todas' : getSelectedCount()}
              {currentFolder && ` de ${currentFolder.strategies.length}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
