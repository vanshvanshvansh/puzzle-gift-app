import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CropStep from '../components/CropStep.jsx'
import ThemedBackground from '../components/ThemedBackground.jsx'
import { THEMES, DURATIONS, GRID_SIZES } from '../lib/themes.js'
import { createPuzzle } from '../lib/db.js'
import { addOwnedPuzzle } from '../lib/localStore.js'

const STEPS = ['image', 'theme', 'difficulty', 'timer', 'confirm']

export default function Create() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [file, setFile] = useState(null)
  const [croppedBlob, setCroppedBlob] = useState(null)
  const [theme, setTheme] = useState(null)
  const [gridSize, setGridSize] = useState(null)
  const [duration, setDuration] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const step = STEPS[stepIndex]
  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const themeData = THEMES[theme]
      const row = await createPuzzle({
        imageBlob: croppedBlob,
        gridSize,
        themeCategory: theme,
        challengeLabel: themeData.challenge_label,
        durationMinutes: duration,
      })
      addOwnedPuzzle({
        owner_token: row.owner_token,
        created_at: row.created_at,
        expires_at: row.expires_at,
      })
      navigate(`/own/${row.owner_token}`)
    } catch (e) {
      console.error(e)
      setError(
        e.message?.includes('fetch') || e.message?.includes('URL')
          ? 'Could not reach the database. Have you set up your .env with Supabase credentials?'
          : e.message || 'Something went wrong creating your puzzle.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <ThemedBackground theme={theme} />
      <div className="card rounded-3xl p-8 w-full max-w-lg flex flex-col items-center gap-6">
        {step === 'image' && !croppedBlob && (
          <>
            <h2 className="font-display text-2xl text-center">Choose a photo</h2>
            <label className="focus-ring btn-primary px-6 py-3 rounded-2xl cursor-pointer">
              Choose Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>
          </>
        )}

        {step === 'image' && file && !croppedBlob && (
          <CropStep
            file={file}
            onConfirm={(blob) => {
              setCroppedBlob(blob)
              goNext()
            }}
            onReset={() => setFile(null)}
          />
        )}

        {step === 'theme' && (
          <>
            <h2 className="font-display text-2xl text-center">Who's this for?</h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`focus-ring rounded-2xl p-4 border transition ${
                    theme === key ? 'border-violet-400 bg-violet-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <StepNav onBack={goBack} onNext={goNext} nextDisabled={!theme} />
          </>
        )}

        {step === 'difficulty' && (
          <>
            <h2 className="font-display text-2xl text-center">Pick a difficulty</h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {GRID_SIZES.map((n) => (
                <button
                  key={n}
                  onClick={() => setGridSize(n)}
                  className={`focus-ring rounded-2xl p-4 border transition ${
                    gridSize === n ? 'border-violet-400 bg-violet-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {n}×{n}
                </button>
              ))}
            </div>
            <StepNav onBack={goBack} onNext={goNext} nextDisabled={!gridSize} />
          </>
        )}

        {step === 'timer' && (
          <>
            <h2 className="font-display text-2xl text-center">How long should this last?</h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  onClick={() => setDuration(d.minutes)}
                  className={`focus-ring rounded-2xl p-4 border transition ${
                    duration === d.minutes ? 'border-violet-400 bg-violet-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/50 text-center">
              After this time, the photo, the link, and all data will be permanently and irreversibly removed.
            </p>
            <StepNav onBack={goBack} onNext={goNext} nextDisabled={!duration} />
          </>
        )}

        {step === 'confirm' && (
          <>
            <h2 className="font-display text-2xl text-center">Ready to create</h2>
            <img src={URL.createObjectURL(croppedBlob)} alt="Your puzzle preview" className="rounded-xl w-40 h-40 object-cover" />
            <ul className="text-sm text-white/70 text-center space-y-1">
              <li>{THEMES[theme].label} · {gridSize}×{gridSize} · {DURATIONS.find((d) => d.minutes === duration)?.label}</li>
            </ul>
            {error && <p className="text-red-300 text-sm text-center">{error}</p>}
            <div className="flex gap-3">
              <button onClick={goBack} className="focus-ring btn-ghost px-5 py-2.5 rounded-xl text-sm" disabled={busy}>
                Back
              </button>
              <button onClick={handleCreate} className="focus-ring btn-primary px-6 py-2.5 rounded-xl text-sm" disabled={busy}>
                {busy ? 'Creating…' : 'Create Game'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepNav({ onBack, onNext, nextDisabled }) {
  return (
    <div className="flex gap-3">
      <button onClick={onBack} className="focus-ring btn-ghost px-5 py-2.5 rounded-xl text-sm">
        Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="focus-ring btn-primary px-6 py-2.5 rounded-xl text-sm disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  )
}
