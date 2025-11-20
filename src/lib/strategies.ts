// ========================================
// SISTEMA COMPLETO DE ESTRATÉGIAS - ROULETTE ANALYZER
// 13 Pastas (226 estratégias) - ATÉ 9 FICHAS
// 7 Pastas (146 estratégias) - MAIS DE 9 FICHAS
// TOTAL: 20 PASTAS, 372 ESTRATÉGIAS
// ========================================

export interface Strategy { 
  id: number
  name: string
  numbers: number[] 
}

export interface StrategyFolder { 
  name: string
  strategies: Strategy[] 
}

export type ChipCategory = 'up-to-9' | 'more-than-9' | 'all'

// ========================================
// ESTRATÉGIAS ATÉ 9 FICHAS - 226 ESTRATÉGIAS
// ========================================

const strategiesUpTo9: StrategyFolder[] = [
  {
    name: "Cores Altos e Baixos",
    strategies: [
      { id: 1, name: "Pretos baixos", numbers: [2,4,6,8,10,11,13,15,17] },
      { id: 2, name: "Vermelhos Altos", numbers: [21,19,23,25,27,30,32,34,36] },
      { id: 3, name: "Pretos Altos", numbers: [20,22,24,26,28,29,31,33,35] },
      { id: 4, name: "Vermelhos Baixos", numbers: [1,3,5,7,9,12,14,16,18] }
    ]
  },
  {
    name: "Cores Dúzia",
    strategies: [
      { id: 5, name: "1DP + proteção 21,30", numbers: [21,30,2,4,6,8,10,11] },
      { id: 6, name: "1DV + proteção 35", numbers: [35,1,3,5,7,9,12] },
      { id: 7, name: "2DP", numbers: [13,15,17,20,22,24] },
      { id: 8, name: "2DV + proteção no 4", numbers: [14,16,18,19,21,23,4] },
      { id: 9, name: "3DP + proteção no 7,3", numbers: [26,28,29,31,33,35,7,3] },
      { id: 10, name: "3DV + proteção 13,6,17", numbers: [25,27,30,32,34,36,13,6,17] }
    ]
  },
  {
    name: "Cores Coluna",
    strategies: [
      { id: 11, name: "Preto 1 Coluna + proteção 9", numbers: [4,10,13,22,28,31,9] },
      { id: 12, name: "Vermelho 1 Coluna + proteção 17", numbers: [7,16,19,25,34,17] },
      { id: 13, name: "Preto 2 Coluna + proteção 30,3", numbers: [2,8,11,17,20,26,29,35,30,3] },
      { id: 14, name: "Vermelho 2 Coluna", numbers: [5,14,23,32] },
      { id: 15, name: "Preto 3 Coluna", numbers: [6,15,24,33] },
      { id: 16, name: "Vermelho 3 Coluna + proteção 35,11", numbers: [3,9,12,18,21,27,30,36,35,11] },
      { id: 17, name: "Vermelho 2 Coluna + Preto 3 Coluna", numbers: [5,14,23,32,6,15,24,33] }
    ]
  },
  {
    name: "Cores Setores",
    strategies: [
      { id: 18, name: "Preto do meio", numbers: [13,6,17,2,20,31,22,29] },
      { id: 19, name: "Vermelho do meio", numbers: [36,27,34,25,1,14,9,18] },
      { id: 20, name: "Vermelho de Cima", numbers: [9,14,1,16,5,23,30,36,27] },
      { id: 21, name: "Preto de Cima", numbers: [22,31,20,33,24,10,8,11,13] },
      { id: 22, name: "Preto de baixo", numbers: [17,2,4,15,26,35,28,29,22] },
      { id: 23, name: "Vermelho de baixo", numbers: [34,25,21,19,32,3,12,7,18] },
      { id: 24, name: "Espelho Preto + proteção 27", numbers: [26,29,31,33,10,13,6,2,27] },
      { id: 25, name: "OC5 Vermelhos + proteção 24,10", numbers: [32,23,27,14,16,5,24,10] }
    ]
  },
  {
    name: "Cores Cavalos",
    strategies: [
      { id: 26, name: "Cavalo 1-4-7 Preto + proteção 5", numbers: [11,31,4,24,17,10,5] },
      { id: 27, name: "Cavalo 1-4-7 Vermelho + proteção 6", numbers: [1,7,14,34,27,21,6] },
      { id: 28, name: "Cavalo 2-5-8 Preto + proteção no 12", numbers: [2,22,20,15,35,28,8,12] },
      { id: 29, name: "Cavalo 2-5-8 Vermelho + proteção 21,23,10", numbers: [12,32,5,25,18,21,23,10] },
      { id: 30, name: "Cavalo 3-6-9 Preto + proteção 27", numbers: [13,33,6,26,29,27] },
      { id: 31, name: "Cavalo 3-6-9 Vermelho + proteção 11", numbers: [3,30,36,16,36,9,19,11] }
    ]
  },
  {
    name: "Terminais Unidos",
    strategies: [
      { id: 32, name: "T0-1", numbers: [0,10,20,30,1,11,21,31] },
      { id: 33, name: "T0-2", numbers: [0,10,20,30,2,12,22,32] },
      { id: 34, name: "T0-3", numbers: [0,10,20,30,3,13,23,33] },
      { id: 35, name: "T0-4", numbers: [0,10,20,30,4,14,24,34] },
      { id: 36, name: "T0-5", numbers: [0,10,20,30,5,15,25,35] },
      { id: 37, name: "T0-6", numbers: [0,10,20,30,6,16,26,36] },
      { id: 38, name: "T0-7", numbers: [0,10,20,30,7,17,27] },
      { id: 39, name: "T0-8", numbers: [0,10,20,30,8,18,28] },
      { id: 40, name: "T0-9", numbers: [0,10,20,30,9,19,29] },
      { id: 41, name: "T1-2", numbers: [1,11,21,31,2,12,22,32] },
      { id: 42, name: "T1-3", numbers: [1,11,21,31,3,13,23,33] },
      { id: 43, name: "T1-4", numbers: [1,11,21,31,4,14,24,34] },
      { id: 44, name: "T1-5", numbers: [1,11,21,31,5,15,25,35] },
      { id: 45, name: "T1-6", numbers: [1,11,21,31,6,16,26,36] },
      { id: 46, name: "T1-7", numbers: [1,11,21,31,7,17,27] },
      { id: 47, name: "T1-8", numbers: [1,11,21,31,8,18,28] },
      { id: 48, name: "T1-9", numbers: [1,11,21,31,9,19,29] },
      { id: 49, name: "T2-3", numbers: [2,12,22,32,3,13,23,33] },
      { id: 50, name: "T2-4", numbers: [2,12,22,32,4,14,24,34] },
      { id: 51, name: "T2-5", numbers: [2,12,22,32,5,15,25,35] },
      { id: 52, name: "T2-6", numbers: [2,12,22,32,6,16,26,36] },
      { id: 53, name: "T2-7", numbers: [2,12,22,32,7,17,27] },
      { id: 54, name: "T2-8", numbers: [2,12,22,32,8,18,28] },
      { id: 55, name: "T2-9", numbers: [2,12,22,32,9,19,29] },
      { id: 56, name: "T3-4", numbers: [3,13,23,33,4,14,24,34] },
      { id: 57, name: "T3-5", numbers: [3,13,23,33,5,15,25,35] },
      { id: 58, name: "T3-6", numbers: [3,13,23,33,6,16,26,36] },
      { id: 59, name: "T3-7", numbers: [3,13,23,33,7,17,27] },
      { id: 60, name: "T3-8", numbers: [3,13,23,33,8,18,28] },
      { id: 61, name: "T3-9", numbers: [3,13,23,33,9,19,29] },
      { id: 62, name: "T4-5", numbers: [4,14,24,34,5,15,25,35] },
      { id: 63, name: "T4-6", numbers: [4,14,24,34,6,16,26,36] },
      { id: 64, name: "T4-7", numbers: [4,14,24,34,7,17,27] },
      { id: 65, name: "T4-8", numbers: [4,14,24,34,8,18,28] },
      { id: 66, name: "T4-9", numbers: [4,14,24,34,9,19,29] },
      { id: 67, name: "T5-6", numbers: [5,15,25,35,6,16,26,36] },
      { id: 68, name: "T5-7", numbers: [5,15,25,35,7,17,27] },
      { id: 69, name: "T5-8", numbers: [5,15,25,35,8,18,28] },
      { id: 70, name: "T5-9", numbers: [5,15,25,35,9,19,29] },
      { id: 71, name: "T6-7", numbers: [6,16,26,36,7,17,27] },
      { id: 72, name: "T6-8", numbers: [6,16,26,36,8,18,28] },
      { id: 73, name: "T6-9", numbers: [6,16,26,36,9,19,29] },
      { id: 74, name: "T7-8", numbers: [7,17,27,8,18,28] },
      { id: 75, name: "T7-9", numbers: [7,17,27,9,19,29] },
      { id: 76, name: "T8-9", numbers: [8,18,28,9,19,29] },
      { id: 77, name: "7/8/9", numbers: [7,18,28,9,29,17,27,8,19] }
    ]
  },
  {
    name: "Terminal Seco",
    strategies: [
      { id: 78, name: "T1", numbers: [1,11,21,31] },
      { id: 79, name: "T2", numbers: [2,12,22,32] },
      { id: 80, name: "T3", numbers: [3,13,23,33] },
      { id: 81, name: "T4", numbers: [4,14,24,34] },
      { id: 82, name: "T5", numbers: [5,15,25,35] },
      { id: 83, name: "T6", numbers: [6,16,26,36] },
      { id: 84, name: "T7", numbers: [7,17,27] },
      { id: 85, name: "T8", numbers: [8,18,28] },
      { id: 86, name: "T9", numbers: [9,19,29] },
      { id: 87, name: "T10", numbers: [0,10,20,30] }
    ]
  },
  {
    name: "Todos com 4 Vizinhos",
    strategies: [
      { id: 88, name: "0com4v", numbers: [4,19,15,32,0,26,3,35,12] },
      { id: 89, name: "1com4v", numbers: [9,31,14,20,1,33,16,24,5] },
      { id: 90, name: "2com4v", numbers: [6,34,17,25,2,21,4,19,15] },
      { id: 91, name: "3com4v", numbers: [15,32,0,26,3,35,12,28,7] },
      { id: 92, name: "4com4v", numbers: [17,25,2,21,4,19,15,32,0] },
      { id: 93, name: "5com4v", numbers: [1,33,16,24,5,10,23,8,30] },
      { id: 94, name: "6com4v", numbers: [11,36,13,27,6,34,17,25,2] },
      { id: 95, name: "7com4v", numbers: [3,35,12,28,7,29,18,22,9] },
      { id: 96, name: "8com4v", numbers: [24,5,10,23,8,30,11,13,36] },
      { id: 97, name: "9com4v", numbers: [7,29,18,22,9,31,14,20,1] },
      { id: 98, name: "10com4v", numbers: [33,16,24,5,10,23,8,30,11] },
      { id: 99, name: "11com4v", numbers: [10,23,8,30,11,36,13,27,6] },
      { id: 100, name: "12com4v", numbers: [0,26,3,35,12,28,7,29,18] },
      { id: 101, name: "13com4v", numbers: [8,30,11,36,13,27,6,34,17] },
      { id: 102, name: "14com4v", numbers: [18,22,9,31,14,20,1,33,16] },
      { id: 103, name: "15com4v", numbers: [2,21,4,19,15,32,0,26,3] },
      { id: 104, name: "16com4v", numbers: [14,20,1,33,16,24,5,10,23] },
      { id: 105, name: "17com4v", numbers: [13,27,6,34,17,25,2,21,4] },
      { id: 106, name: "18com4v", numbers: [12,28,7,29,18,22,9,31,14] },
      { id: 107, name: "19com4v", numbers: [25,2,21,4,19,15,32,0,26] },
      { id: 108, name: "20com4v", numbers: [22,9,31,14,20,1,33,16,24] },
      { id: 109, name: "21com4v", numbers: [34,17,25,2,21,4,19,15,32] },
      { id: 110, name: "22com4v", numbers: [28,7,29,18,22,9,31,14,20] },
      { id: 111, name: "23com4v", numbers: [16,24,5,10,23,8,30,11,36] },
      { id: 112, name: "24com4v", numbers: [20,1,33,16,24,5,10,23,8] },
      { id: 113, name: "25com4v", numbers: [27,6,34,17,25,2,21,4,19] },
      { id: 114, name: "26com4v", numbers: [19,15,32,0,26,3,35,28,12] },
      { id: 115, name: "27com4v", numbers: [30,11,36,13,27,6,34,17,25] },
      { id: 116, name: "28com4v", numbers: [26,3,35,12,28,7,29,18,22] },
      { id: 117, name: "29com4v", numbers: [35,12,28,7,29,18,22,9,31] },
      { id: 118, name: "30com4v", numbers: [5,10,23,8,30,11,36,13,27] },
      { id: 119, name: "31com4v", numbers: [29,18,22,9,31,14,20,1,33] },
      { id: 120, name: "32com4v", numbers: [21,4,19,15,32,0,26,3,35] },
      { id: 121, name: "33com4v", numbers: [31,14,20,1,33,16,24,5,10] },
      { id: 122, name: "34com4v", numbers: [36,13,27,6,34,17,25,2,21] },
      { id: 123, name: "35com4v", numbers: [32,0,26,3,35,12,28,7,29] },
      { id: 124, name: "36com4v", numbers: [23,8,30,11,36,13,27,6,34] }
    ]
  },
  {
    name: "Vizinhos Aleatórios",
    strategies: [
      { id: 125, name: "26-22-24", numbers: [5,24,16,9,22,18,3,26,0] },
      { id: 126, name: "35-33-31", numbers: [16,33,1,14,31,9,12,35,3] },
      { id: 127, name: "GRT7", numbers: [28,7,29,25,17,34,6,27,13] },
      { id: 128, name: "GRT8", numbers: [23,8,30,22,18,29,7,28,12] },
      { id: 129, name: "GRT9", numbers: [7,29,18,22,9,31,15,19,4] },
      { id: 130, name: "12-21com1V", numbers: [4,21,2,35,12,28] },
      { id: 131, name: "13-31com1V", numbers: [27,13,36,9,31,14] },
      { id: 132, name: "6-9com1v", numbers: [34,6,27,31,9,22] },
      { id: 133, name: "23-32com1v", numbers: [0,32,15,8,23,10] },
      { id: 134, name: "33-36com1v", numbers: [1,33,16,13,36,11] },
      { id: 135, name: "16-19com1V", numbers: [33,16,24,15,19,4] },
      { id: 136, name: "26-29com1v", numbers: [3,26,0,7,29,18] },
      { id: 137, name: "17-18-20 com1v", numbers: [25,17,34,22,18,29,14,20,1] }
    ]
  },
  {
    name: "Números Aleatórios",
    strategies: [
      { id: 138, name: "Espelhos esquerda", numbers: [9,12,16,26,29,31,33] },
      { id: 139, name: "Espelhos direita", numbers: [6,13,19,21,23,32,36] },
      { id: 140, name: "Rua 1", numbers: [1,2,3,13,14,15,25,26,27] },
      { id: 141, name: "Rua 2", numbers: [4,5,6,16,17,18,28,29,30] },
      { id: 142, name: "Rua 3", numbers: [7,8,9,19,20,21,31,32,33] },
      { id: 143, name: "Rua 4", numbers: [10,11,12,22,23,24,34,35,36] },
      { id: 144, name: "ParAlto", numbers: [20,22,24,26,28,30,32,34,36] },
      { id: 145, name: "ParBaixo", numbers: [2,4,6,8,10,12,14,16,18] },
      { id: 146, name: "ImparAlto", numbers: [19,21,23,25,27,29,31,33,35] },
      { id: 147, name: "ImparBaixo", numbers: [1,3,5,7,9,11,13,15,17] },
      { id: 148, name: "Quatro direita", numbers: [21,4,19,27,13,36,8,34] },
      { id: 149, name: "Quatro esquerda", numbers: [28,7,29,9,31,14,24] },
      { id: 150, name: "C20D", numbers: [21,23,24,25,27] },
      { id: 151, name: "C20E", numbers: [20,22,24,26,28,29,23,27] },
      { id: 152, name: "Ímpar cima", numbers: [1,5,11,13,23,27,31,33,9,17] },
      { id: 153, name: "Par cima", numbers: [6,8,10,14,16,20,24,30,34,36] },
      { id: 154, name: "Par junto Esquerda", numbers: [16,24,14,20,18,22,12,28] },
      { id: 155, name: "Par junto direita", numbers: [34,6,30,8] },
      { id: 156, name: "Ímpar junto Direita", numbers: [15,19,25,17,27,13] },
      { id: 157, name: "Ímpar junto esquerda", numbers: [1,33,9,31,7,29,3,35] },
      { id: 158, name: "Par esquerda", numbers: [26,12,28,18,22,14,20,16,24] },
      { id: 159, name: "Par direita", numbers: [10,8,30,36,6,34,2,4,32] },
      { id: 160, name: "Ímpar esquerda", numbers: [3,35,7,29,9,31,1,33,5] },
      { id: 161, name: "Ímpar direita", numbers: [23,11,13,27,17,25,21,19,15] },
      { id: 162, name: "OC0", numbers: [28,22,33,11,19,0,10,20,30] },
      { id: 163, name: "OC1", numbers: [34,10,12,21,23,32,29,11] },
      { id: 164, name: "OC2", numbers: [11,20,24,13,31,2,12,22,32] },
      { id: 165, name: "OC3", numbers: [12,14,21,30,36,3,13,23,33] },
      { id: 166, name: "OC4", numbers: [31,22,26,13,15,34,4,14,24] },
      { id: 167, name: "OC5", numbers: [14,16,23,32,27,5,15,25,35] },
      { id: 168, name: "OC6", numbers: [21,15,17,12,24,33,28,9,6] },
      { id: 169, name: "OC7", numbers: [16,18,14,25,34,29,7,17,27] },
      { id: 170, name: "OC8", numbers: [17,19,4,26,35,16,8,18,28] },
      { id: 171, name: "OC9", numbers: [18,27,36,6,9,19,29] },
      { id: 172, name: "Ímpar Voisins", numbers: [25,21,19,15,3,35,7,29] },
      { id: 173, name: "Par Voisins", numbers: [2,4,12,18,22,26,28,32] },
      { id: 174, name: "Espelho esquerda 2", numbers: [26,29,9,31,33,16,12,20,1,3] },
      { id: 175, name: "Espelho direita 2", numbers: [32,19,21,6,13,36,23,2,30,10] },
      { id: 176, name: "Casa do 30", numbers: [30,31,32,33,34,35,36,11,3] },
      { id: 177, name: "Cavalo baixo 147 + proteção 20", numbers: [1,4,7,17,14,10,11] },
      { id: 178, name: "Cavalo Alto 147 + proteção 6", numbers: [21,31,27,24,34,6] },
      { id: 179, name: "Cavalo Baixo 369 + proteção 27", numbers: [3,13,6,16,9,27] },
      { id: 180, name: "Cavalo Alto 369 + proteção 8,11", numbers: [23,33,30,26,36,19,29,8,11] },
      { id: 181, name: "Cavalo Baixo 258 + proteção 10,23", numbers: [2,12,5,15,8,18,10,23] },
      { id: 182, name: "Cavalo Alto 258 + proteção 7,29", numbers: [20,22,32,25,35,18,28,7,29] },
      { id: 183, name: "Ocultos do 29", numbers: [26,3,35,7,29,18,1,10,11] }
    ]
  },
  {
    name: "Todos com 2 Vizinhos",
    strategies: [
      { id: 184, name: "0com2v", numbers: [15,32,0,26,3] },
      { id: 185, name: "1com2v", numbers: [14,20,1,33,16] },
      { id: 186, name: "2com2v", numbers: [17,25,2,21,4] },
      { id: 187, name: "3com2v", numbers: [0,26,3,35,12] },
      { id: 188, name: "4com2v", numbers: [2,21,4,19,15] },
      { id: 189, name: "5com2v", numbers: [16,24,5,10,23] },
      { id: 190, name: "6com2v", numbers: [13,27,6,34,17] },
      { id: 191, name: "7com2v", numbers: [12,28,7,29,18] },
      { id: 192, name: "8com2v", numbers: [10,23,8,30,11] },
      { id: 193, name: "9com2v", numbers: [18,22,9,31,14] },
      { id: 194, name: "10com2v", numbers: [24,5,10,23,8] },
      { id: 195, name: "11com2v", numbers: [8,30,11,36,13] },
      { id: 196, name: "12com2v", numbers: [3,35,12,28,7] },
      { id: 197, name: "13com2v", numbers: [11,36,13,27,6] },
      { id: 198, name: "14com2v", numbers: [9,31,14,20,1] },
      { id: 199, name: "15com2v", numbers: [4,19,15,32,0] },
      { id: 200, name: "16com2v", numbers: [1,33,16,24,5] },
      { id: 201, name: "17com2v", numbers: [6,34,17,25,2] },
      { id: 202, name: "18com2v", numbers: [7,29,18,22,9] },
      { id: 203, name: "19com2v", numbers: [21,4,19,15,32] },
      { id: 204, name: "20com2v", numbers: [31,14,20,1,33] },
      { id: 205, name: "21com2v", numbers: [25,2,21,4,19] },
      { id: 206, name: "22com2v", numbers: [29,18,22,9,31] },
      { id: 207, name: "23com2v", numbers: [5,10,23,8,30] },
      { id: 208, name: "24com2v", numbers: [33,16,24,5,10] },
      { id: 209, name: "25com2v", numbers: [34,17,25,2,21] },
      { id: 210, name: "26com2v", numbers: [32,0,26,3,35] },
      { id: 211, name: "27com2v", numbers: [36,13,27,6,34] },
      { id: 212, name: "28com2v", numbers: [35,12,28,7,29] },
      { id: 213, name: "29com2v", numbers: [28,7,29,18,22] },
      { id: 214, name: "30com2v", numbers: [23,8,30,11,36] },
      { id: 215, name: "31com2v", numbers: [22,9,31,14,20] },
      { id: 216, name: "32com2v", numbers: [19,15,32,0,26] },
      { id: 217, name: "33com2v", numbers: [20,1,33,16,24] },
      { id: 218, name: "34com2v", numbers: [27,6,34,17,25] },
      { id: 219, name: "35com2v", numbers: [26,3,35,12,28] },
      { id: 220, name: "36com2v", numbers: [30,11,36,13,27] }
    ]
  },
  {
    name: "Terminais Cruzados (Dinâmico)",
    strategies: [
      { 
        id: 221, 
        name: "Terminais Cruzados", 
        numbers: [] // Dinâmico - será calculado baseado nos últimos 2 números
      }
    ]
  },
  {
    name: "Voisins e Setores",
    strategies: [
      { id: 339, name: "Voisins", numbers: [7,29,18,22,4,21,2,25] },
      { id: 340, name: "Meio direita", numbers: [2,25,17,34,6,27,13,36,11] },
      { id: 341, name: "Meio esquerda", numbers: [29,18,22,9,31,14,20,1,33] },
      { id: 342, name: "Espelhos de baixo", numbers: [3,26,0,32,2,12,19,21,29] },
      { id: 343, name: "Espelho preto", numbers: [26,0,2,29,6,10,20,31,33] }
    ]
  },
  {
    name: "Até 9",
    strategies: [
      { id: 354, name: "17-18+20s", numbers: [17,18,19,21,23,25,27,22] },
      { id: 355, name: "16,19,8com1V", numbers: [33,16,24,23,8,30,4,19,15] },
      { id: 356, name: "13,12,31,21 — sem vizinhos", numbers: [13,12,31,21] },
      { id: 357, name: "31,35,33 — sem vizinhos", numbers: [31,35,33] },
      { id: 358, name: "22,24,26 — sem vizinhos", numbers: [22,24,26] },
      { id: 359, name: "Vizinhos12,21,13,31", numbers: [2,4,27,36,14,9,7,28,35] },
      { id: 360, name: "Pretos setor vermelho", numbers: [26,15,4,2,17,6,13] },
      { id: 361, name: "Vermelhos setor vermelho", numbers: [36,19,21,25,34,27] },
      { id: 362, name: "Pretos setor verde", numbers: [15,26,28,29,22,35,31] },
      { id: 363, name: "Vermelhos setor verde", numbers: [32,3,12,7,18,9,14,1] },
      { id: 364, name: "Pretos setor amarelo", numbers: [20,33,24,10,8,11,13] },
      { id: 365, name: "Vermelhos setor amarelo", numbers: [14,1,16,5,23,30,36,27] }
    ]
  }
]


// ========================================
// ESTRATÉGIAS MAIS DE 9 FICHAS - 146 ESTRATÉGIAS
// ========================================

const strategiesMoreThan9: StrategyFolder[] = [
  {
    name: "1 Pasta - Números em lugares aleatórios",
    strategies: [
      { id: 224, name: "Espelhos", numbers: [9,12,16,26,29,31,6,13,19,21,23,32] },
      { id: 225, name: "Espelho vermelho + proteção", numbers: [3,12,9,1,16,23,30,36,21,32,19,8,35] },
      { id: 226, name: "4/5/6", numbers: [25,15,6,36,34,4,5,35,16,26,14,24] },
      { id: 227, name: "PF", numbers: [10,11,13,15,17,20,22,24,31,33] },
      { id: 228, name: "123", numbers: [1,3,12,22,31,33,2,11,13,21,23,32] },
      { id: 229, name: "Irmãos de Cor", numbers: [9,12,18,21,16,19,27,30,32,29,8,26,33] },
      { id: 230, name: "Diag Ver", numbers: [3,5,7,16,14,12,25,23,21,30,32,34] },
      { id: 231, name: "Diag Preto", numbers: [6,8,10,17,15,22,20,28,26,24,35,33] },
      { id: 232, name: "2x", numbers: [2,4,6,8,10,14,16,20,22,26,28,32,34] },
      { id: 233, name: "3x", numbers: [3,6,9,12,15,18,21,24,27,30,33,36] },
      { id: 234, name: "Terminal Alto", numbers: [6,7,8,9,16,17,18,19,26,27,28,29,36] },
      { id: 235, name: "Terminal baixo Esquerda", numbers: [1,3,5,12,14,20,22,24,31,33,35] },
      { id: 236, name: "Terminal baixo Direita", numbers: [2,4,10,11,13,15,21,23,25,30,32,34] }
    ]
  },
  {
    name: "2 Pasta - Cavalo, Coluna, Dúzia",
    strategies: [
      { id: 237, name: "Cavalo 1-4-7", numbers: [1,11,21,31,4,14,24,34,7,17,27] },
      { id: 238, name: "Cavalo 2-5-8", numbers: [2,12,22,32,5,15,25,35,8,18,28] },
      { id: 239, name: "Cavalo 3-6-9", numbers: [3,13,23,33,6,16,26,36,9,19,29] },
      { id: 240, name: "Coluna 1", numbers: [1,4,7,10,13,16,19,22,25,28,32,34] },
      { id: 241, name: "Coluna 2", numbers: [2,5,8,11,14,17,20,23,26,29,32,35] },
      { id: 242, name: "Coluna 3", numbers: [3,6,9,12,15,18,21,24,27,30,33,36] },
      { id: 243, name: "Duzia 1", numbers: [1,2,3,4,5,6,7,8,9,10,11,12] },
      { id: 244, name: "Duzia 2", numbers: [13,14,15,16,17,18,20,21,22,23,24] },
      { id: 245, name: "Duzia 3", numbers: [25,26,27,28,29,30,31,32,33,34,35,36] },
      { id: 246, name: "CA-OC 1-4-9", numbers: [1,11,21,31,4,14,24,34,9,19,29] },
      { id: 247, name: "CA-OC 3-5-7", numbers: [3,13,23,33,5,15,25,35,7,17,27] },
      { id: 248, name: "CA-OC 3-4-6", numbers: [3,13,23,33,4,14,24,34,6,16,26,36] },
      { id: 249, name: "CA-OC 5-3-6", numbers: [5,15,25,35,3,13,23,33,6,16,26,36] }
    ]
  },
  {
    name: "3 Pasta - Terminal iniciante",
    strategies: [
      { id: 250, name: "Terminal iniciante 1", numbers: [1,10,11,12,13,14,15,16,17,18,19,33] },
      { id: 251, name: "Terminal iniciante 2", numbers: [2,20,21,22,23,24,25,26,27,28,29,7,18] },
      { id: 252, name: "Terminal iniciante 3", numbers: [3,30,31,32,33,34,35,36,11] }
    ]
  },
  {
    name: "4 Pasta - Quadrantes",
    strategies: [
      { id: 253, name: "21com4v", numbers: [32,15,19,4,21,2,25,17,34] },
      { id: 254, name: "11com4v", numbers: [6,27,13,36,11,30,8,23,10] },
      { id: 255, name: "1com4v", numbers: [5,24,16,33,1,20,14,31,9] },
      { id: 256, name: "28com4v", numbers: [22,18,29,7,28,12,35,3,26] }
    ]
  },
  {
    name: "4 Pasta - Fatias",
    strategies: [
      { id: 257, name: "4com3v", numbers: [32,15,19,4,21,2,25] },
      { id: 258, name: "27com3v", numbers: [17,34,6,27,13,36,11] },
      { id: 259, name: "10com3v", numbers: [30,8,23,10,5,24,16,33] },
      { id: 260, name: "31com3v", numbers: [1,20,14,31,9,22,18] },
      { id: 261, name: "12com3v", numbers: [29,7,28,12,35,3,26] }
    ]
  },
  {
    name: "4 Pasta - 4 Hemisférios",
    strategies: [
      { id: 262, name: "0com6v", numbers: [7,28,12,35,3,26,0,32,15,19,4,21] },
      { id: 263, name: "10com3v", numbers: [16,24,5,10,23,8,30] },
      { id: 264, name: "6com4v", numbers: [2,25,17,34,6,27,13,36,11] },
      { id: 265, name: "31com4v", numbers: [33,1,20,14,31,9,22,18,29] }
    ]
  },
  {
    name: "4 Pasta - NSM",
    strategies: [
      { id: 266, name: "2com6v", numbers: [32,15,19,4,21,2,25,17,34,6,27,13] },
      { id: 267, name: "10com6v", numbers: [20,1,33,16,24,5,10,23,8,30,11,36] },
      { id: 268, name: "7com6v", numbers: [14,31,9,22,18,29,7,28,12,35,3,26] }
    ]
  },
  {
    name: "4 Pasta - PMZ",
    strategies: [
      { id: 269, name: "0com6v PMZ", numbers: [7,28,12,35,3,26,0,32,15,19,4,21,2] },
      { id: 270, name: "20com6v PMZ", numbers: [29,18,22,9,31,14,20,1,33,16,24,5] },
      { id: 271, name: "36com6v PMZ", numbers: [10,23,8,30,11,36,13,27,6,34,17,25] }
    ]
  },
  {
    name: "4 Pasta - Gringa",
    strategies: [
      { id: 272, name: "34com6v", numbers: [4,21,2,25,17,34,6,27,13,36,11,30] },
      { id: 273, name: "16com6v", numbers: [8,23,10,5,24,16,33,1,20,14,31,9] },
      { id: 274, name: "35com6v", numbers: [22,18,29,7,28,12,35,3,26,0,32,15,19] }
    ]
  },
  {
    name: "5 Pasta - Jogadas nos vizinhos",
    strategies: [
      { id: 275, name: "Gêmeos", numbers: [2,25,17,36,11,30,16,33,1,9,22,18] },
      { id: 276, name: "TV9", numbers: [31,9,22,18,29,7,15,19,4,34,6,27] },
      { id: 277, name: "25-4-6-8", numbers: [23,8,30,27,6,34,17,25,2,21,4,19] },
      { id: 278, name: "QUATRO 4", numbers: [21,4,19,27,13,36,28,7,29,9,31,14] },
      { id: 279, name: "28-8-4-16", numbers: [12,28,7,33,16,24,30,8,23,19,4,21] },
      { id: 280, name: "19-27-9-29", numbers: [15,19,4,6,27,13,22,9,31,7,29,18] },
      { id: 281, name: "23-24-25-26", numbers: [16,24,5,0,26,3,2,25,17,10,23,8] },
      { id: 282, name: "16-17-18-19", numbers: [33,16,24,29,18,22,25,17,34,15,19,4] },
      { id: 283, name: "32-33-34-35", numbers: [0,32,15,17,34,6,3,35,12,1,33,16] },
      { id: 284, name: "3-9-15-6", numbers: [35,3,26,22,9,31,32,15,19,34,6,27] },
      { id: 285, name: "12-13-14-15", numbers: [35,12,28,31,14,20,32,15,19,27,13,36] },
      { id: 286, name: "3-9-33-36", numbers: [26,3,35,18,22,9,31,1,33,16,13,36,11] },
      { id: 287, name: "11-16-19-35", numbers: [36,11,30,15,19,4,24,16,33,12,35,3] },
      { id: 288, name: "15-34-36-33", numbers: [32,15,19,17,34,6,13,36,11,1,33,16] },
      { id: 289, name: "35-31-33-36", numbers: [3,35,12,9,31,14,1,33,16,13,36,11] },
      { id: 290, name: "21-6-12-24", numbers: [4,21,2,34,6,27,35,12,28,16,24,5] },
      { id: 291, name: "7-14-24-27", numbers: [28,7,29,31,14,20,16,24,5,13,27,6] },
      { id: 292, name: "21-25-27-23", numbers: [4,21,2,25,17,34,6,27,13,8,23,10] },
      { id: 293, name: "9com6v vizinhos", numbers: [16,33,1,20,14,31,9,22,18,29,7,28,12] },
      { id: 294, name: "6com6v vizinhos", numbers: [8,30,11,36,13,27,6,34,17,25,2,21,4] },
      { id: 295, name: "GRT 0", numbers: [26,0,32,23,10,5,11,30,8,1,20,14] },
      { id: 296, name: "GRT 1", numbers: [30,11,36,4,21,2,22,9,31,33,1,20] },
      { id: 297, name: "GRT 2", numbers: [35,12,28,18,22,9,0,32,15,25,2,21] },
      { id: 298, name: "GRT 3", numbers: [26,3,35,1,33,16,27,13,36,8,23,10] },
      { id: 299, name: "GRT 4", numbers: [19,4,21,6,34,17,31,14,20,16,24,5] },
      { id: 300, name: "GRT 5", numbers: [2,25,17,32,15,19,3,35,12,24,5,10] },
      { id: 301, name: "GRT 6", numbers: [34,6,27,11,36,13,3,26,0,33,16,24] }
    ]
  },
  {
    name: "6 Pasta - Números que se puxam",
    strategies: [
      { id: 302, name: "0+Proteção", numbers: [10,20,30,19,28,22,33,11,9] },
      { id: 303, name: "1+Proteção", numbers: [10,11,26,29,21,31,2] },
      { id: 304, name: "2+Proteção", numbers: [20,22,17,21,4,11,12,32,1,3] },
      { id: 305, name: "3+Proteção", numbers: [30,33,36,6,9,11,22,13,23,2,4] },
      { id: 306, name: "4+Proteção", numbers: [2,13,31,21,8,7,14,24,34,3,5] },
      { id: 307, name: "5+Proteção", numbers: [32,23,10,16,14,15,25,35,4,6] },
      { id: 308, name: "6+Proteção", numbers: [12,21,24,3,9,15,33,16,36,26,7,5] },
      { id: 309, name: "7+Proteção", numbers: [14,28,24,5,29,3,17,27,8,6] },
      { id: 310, name: "8+Proteção", numbers: [4,16,35,19,26,18,28,17,7,9] },
      { id: 311, name: "9+Proteção", numbers: [6,18,36,27,19,29,8,10] },
      { id: 312, name: "10+Proteção", numbers: [4,20,30,5,28,19,0,11,9] },
      { id: 313, name: "11+Proteção", numbers: [22,33,1,29,26,10,2,21,31,12] },
      { id: 314, name: "12+Proteção", numbers: [3,6,21,24,1,20,22,2,32,11,13] },
      { id: 315, name: "13+Proteção", numbers: [2,22,4,31,32,26,14,3,23,33,12] },
      { id: 316, name: "14+Proteção", numbers: [5,3,7,28,15,4,24,34,13] },
      { id: 317, name: "15+Proteção", numbers: [6,30,25,14,4,5,35,16] },
      { id: 318, name: "16+Proteção", numbers: [19,8,7,17,18,2,26,36,15] },
      { id: 319, name: "17+Proteção", numbers: [27,8,18,20,6,7,27,16] },
      { id: 320, name: "18+Proteção", numbers: [17,19,9,36,7,8,28] },
      { id: 321, name: "19+Proteção", numbers: [16,8,17,18,9,28,20] },
      { id: 322, name: "20+Proteção", numbers: [17,2,25,22,1,21,10,30,19] },
      { id: 323, name: "21+Proteção", numbers: [3,12,24,6,1,11,10,31,23,25,27,20,22] },
      { id: 324, name: "22+Proteção", numbers: [2,11,33,4,21,20,24,26,12,32,23] },
      { id: 325, name: "23+Proteção", numbers: [32,5,10,1,21,25,27,3,33,13,22,24] },
      { id: 326, name: "24+Proteção", numbers: [22,26,6,14,7,2,4,34,23,25] },
      { id: 327, name: "25+Proteção", numbers: [15,21,23,27,7,5,35,24,26] },
      { id: 328, name: "26+Proteção", numbers: [4,8,29,22,24,6,16,36,25,27,13] },
      { id: 329, name: "27+Proteção", numbers: [9,5,17,6,7,28,26] },
      { id: 330, name: "28+Proteção", numbers: [10,14,6,5,7,18,8,27,29] },
      { id: 331, name: "29+Proteção", numbers: [26,1,10,11,4,7,28,9,19,30] },
      { id: 332, name: "30+Proteção", numbers: [3,15,33,29,32,34,36,10,20,31] },
      { id: 333, name: "31+Proteção", numbers: [13,35,33,2,4,21,1,11,30,32] },
      { id: 334, name: "32+Proteção", numbers: [23,5,34,30,36,2,12,22,31,33] },
      { id: 335, name: "33+Proteção", numbers: [36,3,11,22,6,35,23,13,32,34] },
      { id: 336, name: "34+Proteção", numbers: [30,32,36,7,14,4,24,33,35] },
      { id: 337, name: "35+Proteção", numbers: [31,33,8,5,15,25,36,34] },
      { id: 338, name: "36+Proteção", numbers: [9,18,3,33,6,16,35] }
    ]
  },
  {
    name: "Voisins e Setores Expandidos",
    strategies: [
      { id: 344, name: "10com5v", numbers: [36,11,30,8,23,10,5,24,16,33,1] },
      { id: 345, name: "0com5v", numbers: [28,12,35,3,26,0,32,15,19,4,21] },
      { id: 346, name: "Voisins2", numbers: [28,7,29,18,22,9,19,4,21,2,25,17] },
      { id: 347, name: "Meio", numbers: [17,34,6,27,13,9,31,14,20,1] },
      { id: 348, name: "Meio2", numbers: [25,17,34,6,27,13,22,9,31,14,20,1] },
      { id: 349, name: "Espelhos de cima", numbers: [1,6,9,10,13,16,20,23,31,33,36] },
      { id: 350, name: "Espelho vermelho", numbers: [1,9,16,23,36,3,0,32,12,19,21] },
      { id: 351, name: "OC5 completo (13 fichas)", numbers: [32,23,27,14,16,5,24,10,28,19,15,25,35] }
    ]
  },
  {
    name: "Mais de 9",
    strategies: [
      { id: 366, name: "Irmãos de cor vermelho", numbers: [9,12,16,19,18,21,27,30,4,22] },
      { id: 367, name: "Irmãos de cor preto", numbers: [8,11,10,13,17,20,26,29,28,31,7,30,14] },
      { id: 368, name: "Chamam 2-4-6-8", numbers: [20,35,24,22,31,13,26,15,17,28,33] }
    ]
  }
]

// ========================================
// FUNÇÕES AUXILIARES E EXPORTAÇÕES
// ========================================

export function getAllStrategies(category: ChipCategory): StrategyFolder[] {
  if (category === 'all') {
    // Combinar todas as estratégias (até 9 + mais de 9)
    return [...strategiesUpTo9, ...strategiesMoreThan9]
  }
  return category === 'up-to-9' ? strategiesUpTo9 : strategiesMoreThan9
}

export function getFolderByName(category: ChipCategory, folderName: string): StrategyFolder | undefined {
  const folders = getAllStrategies(category)
  return folders.find(folder => folder.name === folderName)
}

export function getStrategyById(category: ChipCategory, strategyId: number): Strategy | undefined {
  const folders = getAllStrategies(category)
  for (const folder of folders) {
    const strategy = folder.strategies.find(s => s.id === strategyId)
    if (strategy) return strategy
  }
  return undefined
}

export function getStrategiesByIds(category: ChipCategory, strategyIds: number[]): Strategy[] {
  const folders = getAllStrategies(category)
  const result: Strategy[] = []
  for (const folder of folders) {
    for (const strategy of folder.strategies) {
      if (strategyIds.includes(strategy.id)) {
        result.push(strategy)
      }
    }
  }
  return result
}

// ========================================
// ESTATÍSTICAS DO SISTEMA
// ========================================
/*
RESUMO COMPLETO:

ATÉ 9 FICHAS (12 pastas, 223 estratégias):
1. Cores Altos e Baixos: 4 estratégias
2. Cores Dúzia: 6 estratégias
3. Cores Coluna: 7 estratégias
4. Cores Setores: 8 estratégias
5. Cores Cavalos: 6 estratégias
6. Terminais Unidos: 46 estratégias
7. Terminal Seco: 10 estratégias
8. Todos com 4 Vizinhos: 37 estratégias
9. Vizinhos Aleatórios: 13 estratégias
10. Números Aleatórios: 46 estratégias
11. Todos com 2 Vizinhos: 37 estratégias
12. Combinações de Terminais Cruzados: 3 estratégias

MAIS DE 9 FICHAS (6 pastas, 138 estratégias):
1 Pasta - Números em lugares aleatórios: 13 estratégias
2 Pasta - Cavalo, Coluna, Dúzia: 13 estratégias
3 Pasta - Terminal iniciante: 3 estratégias
4 Pasta - Quadrantes: 4 estratégias
4 Pasta - Fatias: 5 estratégias
4 Pasta - 4 Hemisférios: 4 estratégias
4 Pasta - NSM: 3 estratégias
4 Pasta - PMZ: 3 estratégias
4 Pasta - Gringa: 3 estratégias
5 Pasta - Jogadas nos vizinhos: 27 estratégias
6 Pasta - Números que se puxam: 37 estratégias

TOTAL GERAL: 18 PASTAS, 361 ESTRATÉGIAS
*/

// ========================================
// FUNÇÃO PARA ESTRATÉGIAS DINÂMICAS
// ========================================

/**
 * Calcula os números para a estratégia "Terminais Cruzados"
 * Regra: Quando saem 2 números CONSECUTIVOS de terminais DIFERENTES (4, 5 ou 9),
 * jogar no terminal que falta.
 * 
 * Exemplos:
 * - Se saiu 4 e depois 5 → jogar [9,19,29]
 * - Se saiu 5 e depois 9 → jogar [4,14,24,34]
 * - Se saiu 9 e depois 4 → jogar [5,15,25,35]
 * 
 * Combinações válidas (80 no total):
 * - (4 & 5) ou (5 & 4) → 9,19,29
 * - (5 & 9) ou (9 & 5) → 4,14,24,34
 * - (4 & 9) ou (9 & 4) → 5,15,25,35
 */
export function calculateTerminaisCruzados(lastNumbers: number[]): number[] {
  if (lastNumbers.length < 2) return []
  
  const last1 = lastNumbers[0] // Mais recente
  const last2 = lastNumbers[1] // Penúltimo
  
  // Ignora zero
  if (last1 === 0 || last2 === 0) return []
  
  // Determina o terminal de cada número (4, 5 ou 9)
  const getTerminal = (num: number): number | null => {
    const lastDigit = num % 10
    if (lastDigit === 4) return 4
    if (lastDigit === 5) return 5
    if (lastDigit === 9) return 9
    return null
  }
  
  const terminal1 = getTerminal(last1)
  const terminal2 = getTerminal(last2)
  
  // Se algum dos números não termina em 4, 5 ou 9, não aplica
  if (!terminal1 || !terminal2) return []
  
  // Se os terminais são iguais, não aplica
  if (terminal1 === terminal2) return []
  
  // Determina qual terminal jogar (o que falta)
  const terminaisSet = new Set([terminal1, terminal2])
  
  // (4 & 5) ou (5 & 4) → 9,19,29
  if (terminaisSet.has(4) && terminaisSet.has(5)) {
    return [9, 19, 29]
  }
  
  // (5 & 9) ou (9 & 5) → 4,14,24,34
  if (terminaisSet.has(5) && terminaisSet.has(9)) {
    return [4, 14, 24, 34]
  }
  
  // (4 & 9) ou (9 & 4) → 5,15,25,35
  if (terminaisSet.has(4) && terminaisSet.has(9)) {
    return [5, 15, 25, 35]
  }
  
  return []
}

// ========================================
// FUNÇÃO PARA OBTER ESTRATÉGIAS COM LÓGICA DINÂMICA
// ========================================

export function getStrategyNumbers(strategyId: number, lastNumbers: number[]): number[] {
  // Estratégia 221: Terminais Cruzados (dinâmica)
  if (strategyId === 221) {
    return calculateTerminaisCruzados(lastNumbers)
  }
  
  // Para outras estratégias, retornar os números fixos
  const allStrategies = [...strategiesUpTo9, ...strategiesMoreThan9]
    .flatMap(folder => folder.strategies)
  
  const strategy = allStrategies.find(s => s.id === strategyId)
  return strategy?.numbers || []
}
