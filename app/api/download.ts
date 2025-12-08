import { NextRequest, NextResponse } from 'next/server'
import { readFile, existsSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')
    const folder = searchParams.get('folder')

    if (!file || !folder) {
      return NextResponse.json({ error: 'Brak nazwy pliku lub folderu' }, { status: 400 })
    }

    const filePath = join(process.cwd(), 'uploads', folder, file)

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Plik nie istnieje' }, { status: 404 })
    }

    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      readFile(filePath, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })

    // Ustawienie odpowiednich nagłówków
    const headers = new Headers()
    headers.set('Content-Type', 'audio/mpeg')
    headers.set('Content-Disposition', `attachment; filename="${file}"`)
    headers.set('Content-Length', fileBuffer.length.toString())

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Błąd pobierania pliku:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania pliku' },
      { status: 500 }
    )
  }
}