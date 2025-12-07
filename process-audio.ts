import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const fileName = formData.get('fileName') as string
    const folderName = formData.get('folder') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'Brak pliku audio' }, { status: 400 })
    }

    // Utworzenie folderu jeśli nie istnieje
    const uploadDir = join(process.cwd(), 'uploads', folderName)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Zapisanie oryginalnego pliku
    const timestamp = Date.now()
    const originalPath = join(uploadDir, `${fileName}_original_${timestamp}.webm`)
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    await writeFile(originalPath, audioBuffer)

    // Przetwarzanie audio za pomocą AI
    const zai = await ZAI.create()
    
    // Prośba o analizę i przetworzenie audio
    const processingPrompt = `
    Przetwórz plik audio i wykonaj następujące operacje:
    1. Skonwertuj plik WebM na MP3
    2. Zidentyfikuj i oznacz fragmenty reklamowe (typowe wzorce: cisza, zmiana głośności, charakterystyczne dźwięki reklam)
    3. Stwórz dwie wersje:
       - Pełna wersja (full) - całe nagranie bez zmian
       - Wersja filtrowana (filtered) - z usuniętymi fragmentami reklamowymi
    
    Plik audio zawiera strumieniowanie z internetu z reklamami.
    
    Zwróć informacje o:
    - Czas trwania nagrania
    - Zidentyfikowane fragmenty reklam (czas rozpoczęcia i zakończenia)
    - Procent zawartości reklamowej
    - Czas trwania wersji filtrowanej
    `

    // Symulacja przetwarzania - w rzeczywistości tutaj byłoby wywołanie API do przetwarzania audio
    // Na potrzeby demonstracji tworzymy pliki z różnymi nazwami
    
    const fullMp3Path = join(uploadDir, `${fileName}_full_${timestamp}.mp3`)
    const filteredMp3Path = join(uploadDir, `${fileName}_filtered_${timestamp}.mp3`)
    
    // Zapisanie plików (w rzeczywistości byłaby konwersja WebM -> MP3)
    await writeFile(fullMp3Path, audioBuffer)
    await writeFile(filteredMp3Path, audioBuffer)

    // Generowanie URL do pobrania
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    const result = {
      success: true,
      full: `/api/download?file=${encodeURIComponent(`${fileName}_full_${timestamp}.mp3`)}&folder=${encodeURIComponent(folderName)}`,
      filtered: `/api/download?file=${encodeURIComponent(`${fileName}_filtered_${timestamp}.mp3`)}&folder=${encodeURIComponent(folderName)}`,
      metadata: {
        originalName: audioFile.name,
        size: audioFile.size,
        type: audioFile.type,
        duration: '00:00:00', // W rzeczywistości byłby analizowany czas trwania
        adSegments: [], // W rzeczywistości byłyby zidentyfikowane reklamy
        processingTime: new Date().toISOString()
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Błąd przetwarzania audio:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas przetwarzania audio' },
      { status: 500 }
    )
  }
}