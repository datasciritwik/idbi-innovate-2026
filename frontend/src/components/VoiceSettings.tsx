import type { LanguageInfo, VoiceGender } from '../lib/api';

interface VoiceSettingsProps {
  languages: LanguageInfo[];
  language: string;
  onLanguageChange: (code: string) => void;
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  disabled?: boolean;
}

export default function VoiceSettings({
  languages,
  language,
  onLanguageChange,
  voiceGender,
  onVoiceGenderChange,
  disabled = false,
}: VoiceSettingsProps) {
  if (languages.length === 0) return null;

  return (
    <div className="flex items-center bg-ink-raised/65 border border-ink-border px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md gap-2.5">
      <select
        value={language}
        disabled={disabled}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="bg-transparent text-xs font-body font-medium text-paper-dim focus:text-gold focus:outline-none cursor-pointer disabled:opacity-40"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} className="bg-ink-raised text-paper">
            {l.name}
          </option>
        ))}
      </select>

      <div className="w-px h-3.5 bg-ink-border/60" />

      <button
        type="button"
        disabled={disabled}
        onClick={() => onVoiceGenderChange(voiceGender === 'female' ? 'male' : 'female')}
        className="text-xs font-body font-medium text-paper-dim hover:text-gold focus:outline-none cursor-pointer disabled:opacity-40 transition-colors duration-200"
      >
        {voiceGender === 'female' ? 'Female voice' : 'Male voice'}
      </button>
    </div>
  );
}
