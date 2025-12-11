

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card-simple.tsx'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Play, Square, Save, Download, Mic, MicOff, Volume2 } from 'lucide-react'

export default function StreamingRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [processedFiles, setProcessedFiles] = useState<{full: string, filtered: string} | null>(null)
  const [selectedFolder, setSelectedFolder] = useState('')
  const [fileName, setFileName] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      // Przechwytywanie audio z systemu (łącznie z dźwiękiem z przeglądarki)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          suppressLocalAudioPlayback: false,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      // Dodanie mikrofonu jeśli potrzebny
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const audioContext = new AudioContext()
        
        micStream.getAudioTracks().forEach(track => {
          stream.addTrack(track)
        })
        
        audioContextRef.current = audioContext
      } catch (micError) {
        console.log('Mikrofon niedostępny, używam tylko dźwięku systemowego')
      }

      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        setAudioChunks([audioBlob])
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)
      
      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Błąd rozpoczynania nagrywania:', error)
      alert('Nie udało się rozpocząć nagrywania. Upewnij się, że udzieliłeś zgody na dostęp do dźwięku.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const pauseResumeRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
      } else {
        mediaRecorderRef.current.pause()
        setIsPaused(true)
      }
    }
  }

  const processAudio = async () => {
    if (audioChunks.length === 0) return
    
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('audio', audioChunks[0], 'recording.webm')
      formData.append('fileName', fileName || `recording_${Date.now()}`)
      formData.append('folder', selectedFolder || 'recordings')
      
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        setProcessedFiles(result)
      } else {
        throw new Error('Błąd przetwarzania audio')
      }
    } catch (error) {
      console.error('Błąd:', error)
      alert('Wystąpił błąd podczas przetwarzania audio')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">Streaming Audio Recorder</h1>
          <p className="text-green-600">Nagrywaj i przetwarzaj strumienie audio z filtrowaniem reklam</p>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm border-green-200 shadow-xl">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-6 h-6" />
              Panel Nagrywania
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            
            {/* Status nagrywania */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Badge variant={isRecording ? "destructive" : "secondary"} className="text-sm">
                  {isRecording ? (isPaused ? 'Wstrzymano' : 'Nagrywanie...') : 'Gotowy'}
                </Badge>
                {isRecording && (
                  <span className="text-2xl font-mono text-green-700">
                    {formatTime(recordingTime)}
                  </span>
                )}
              </div>
              
              {isRecording && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Nagrywanie w toku...</span>
                </div>
              )}
            </div>

            {/* Przyciski sterowania */}
            <div className="flex flex-wrap gap-4 justify-center mb-6">
              {!isRecording ? (
                <Button 
                  onClick={startRecording}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Rozpocznij Nagrywanie
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={pauseResumeRecording}
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-50"
                  >
                    {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                    {isPaused ? 'Wznów' : 'Wstrzymaj'}
                  </Button>
                  <Button 
                    onClick={stopRecording}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Zatrzymaj
                  </Button>
                </>
              )}
            </div>

            {/* Ustawienia zapisu */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nazwa pliku
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="np. moja_nagrywana_muzyka"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder docelowy
                </label>
                <input
                  type="text"
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  placeholder="np. moje_nagrania"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Przycisk zapisu */}
            {audioChunks.length > 0 && !processedFiles && (
              <div className="text-center">
                <Button 
                  onClick={processAudio}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  size="lg"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {isProcessing ? 'Przetwarzanie...' : 'Zapisz i Przetwórz'}
                </Button>
              </div>
            )}

            {/* Postęp przetwarzania */}
            {isProcessing && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Przetwarzanie audio...</span>
                  <span className="text-sm text-gray-600">Proszę czekać</span>
                </div>
                <Progress value={66} className="h-2" />
              </div>
            )}

            {/* Wyniki */}
            {processedFiles && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  ✓ Zakończono przetwarzanie!
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-green-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Pełne nagranie</h4>
                      <p className="text-sm text-gray-600 mb-3">Zawiera reklamy i całą treść</p>
                      <Button 
                        onClick={() => downloadFile(processedFiles.full, `${fileName || 'recording'}_full.mp3`)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Pobierz pełną wersję
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-green-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Wersja filtrowana</h4>
                      <p className="text-sm text-gray-600 mb-3">Bez reklam, przycięte fragmenty</p>
                      <Button 
                        onClick={() => downloadFile(processedFiles.filtered, `${fileName || 'recording'}_filtered.mp3`)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Pobierz wersję bez reklam
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instrukcje */}
        <Card className="mt-6 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Jak to działa?</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li>1. <strong>Kliknij "Rozpocznij Nagrywanie"</strong> - Wybierz okno lub kartę z dźwiękiem do nagrania</li>
              <li>2. <strong>Nagrywaj</strong> - Program przechwyci cały dźwięk systemowy łącznie z reklamami</li>
              <li>3. <strong>Zatrzymaj nagrywanie</strong> - Kiedy skończysz, kliknij "Zatrzymaj"</li>
              <li>4. <strong>Przetwarzanie</strong> - Program stworzy dwie wersje: pełną i bez reklam</li>
              <li>5. <strong>Pobierz pliki</strong> - Zapisz obie wersje w wybranym folderze</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}