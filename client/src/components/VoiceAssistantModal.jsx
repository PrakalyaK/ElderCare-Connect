import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Pill,
} from 'lucide-react';
import { api } from '../api/client';
import { useProfile } from '../context/ProfileContext';

export function VoiceAssistantModal({ isOpen, onClose, onActionExecuted }) {
  const { activeProfile } = useProfile();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responseMessage, setResponseMessage] = useState('Hello! Tap the microphone and say: "What medicines do I have today?" or "Mark my medicine as taken".');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [processing, setProcessing] = useState(false);

  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('Listening...');
      };

      recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        setTranscript(spokenText);
        handleCommand(spokenText);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setResponseMessage('Microphone access was blocked. You can still click any of the quick voice buttons below!');
        } else {
          setResponseMessage(`Listening ended (${event.error}). Please try speaking again or click a quick action below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSupported(false);
      setResponseMessage('Your browser does not have speech recognition enabled, but all voice actions can be triggered using the buttons below!');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, [activeProfile]);

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower, calm cadence for elderly clarity
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      stopSpeaking();
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  const handleCommand = async (rawInput) => {
    if (!activeProfile) {
      const msg = 'Please select or create an active healthcare profile first.';
      setResponseMessage(msg);
      speak(msg);
      return;
    }

    const command = rawInput.toLowerCase();
    setProcessing(true);

    try {
      // 1. "What medicines do I have today?"
      if (command.includes('medicine') || command.includes('medication') || command.includes('pills') || command.includes('schedule')) {
        const scheduleRes = await api.getTodaySchedule(activeProfile.id);
        const { schedule, summary } = scheduleRes;

        if (schedule.length === 0) {
          const reply = 'You have no medications scheduled for today.';
          setResponseMessage(reply);
          speak(reply);
        } else {
          const pending = schedule.filter(s => s.status === 'pending');
          const taken = schedule.filter(s => s.status === 'taken');

          let reply = `You have ${schedule.length} scheduled medicines today. You have already taken ${taken.length}. `;
          if (pending.length > 0) {
            reply += `Your next pending medicine is ${pending[0].name} (${pending[0].dosage}) scheduled for ${pending[0].scheduledTime}.`;
          } else {
            reply += 'All scheduled medicines for today have been taken! Great job.';
          }
          setResponseMessage(reply);
          speak(reply);
        }
      }
      // 2. "Show my next appointment" / "What appointment do I have?"
      else if (command.includes('appointment') || command.includes('doctor') || command.includes('visit')) {
        const apptsRes = await api.getAppointments(activeProfile.id);
        const nextAppt = apptsRes.nextAppointment;

        if (!nextAppt) {
          const reply = 'You have no upcoming doctor appointments scheduled at this time.';
          setResponseMessage(reply);
          speak(reply);
        } else {
          const reply = `Your next appointment is with Dr. ${nextAppt.doctorName}, specialist in ${nextAppt.specialization}, on ${nextAppt.appointmentDate} at ${nextAppt.appointmentTime} at ${nextAppt.hospitalClinic}.`;
          setResponseMessage(reply);
          speak(reply);
        }
      }
      // 3. "Mark my medicine as taken"
      else if (command.includes('mark') || command.includes('taken') || command.includes('took')) {
        const scheduleRes = await api.getTodaySchedule(activeProfile.id);
        const pending = scheduleRes.schedule.filter(s => s.status === 'pending');

        if (pending.length === 0) {
          const reply = 'All of today\'s scheduled medicines are already marked as taken!';
          setResponseMessage(reply);
          speak(reply);
        } else {
          // Find matching medication or take the earliest pending
          let target = pending[0];
          for (const p of pending) {
            if (command.includes(p.name.toLowerCase())) {
              target = p;
              break;
            }
          }

          await api.markDoseTaken(activeProfile.id, target.id, 'Marked taken via Voice Assistant');
          const reply = `Success! I have marked your ${target.name} (${target.dosage}) as taken. Your Care Circle has been notified.`;
          setResponseMessage(reply);
          speak(reply);

          if (onActionExecuted) onActionExecuted();
        }
      }
      // 4. "Read summary"
      else if (command.includes('summary') || command.includes('briefing') || command.includes('update')) {
        const summaryRes = await api.getDailySummary(activeProfile.id);
        setResponseMessage(summaryRes.spokenText);
        speak(summaryRes.spokenText);
      }
      // 5. Emergency
      else if (command.includes('emergency') || command.includes('help') || command.includes('call')) {
        const emRes = await api.getEmergencyDetails(activeProfile.id);
        const primary = emRes.contacts.find(c => c.isPrimary) || emRes.contacts[0];
        const reply = primary
          ? `Emergency contact is ${primary.name}, ${primary.relationship}, phone number ${primary.phone}. In immediate medical danger, please call 911.`
          : 'Please dial 911 immediately in any medical emergency.';
        setResponseMessage(reply);
        speak(reply);
      } else {
        const reply = `I heard: "${rawInput}". You can ask me: "What medicines do I have today?", "Show my next appointment", or "Mark my medicine as taken".`;
        setResponseMessage(reply);
        speak(reply);
      }
    } catch (err) {
      console.error('Voice command execution error:', err);
      const errReply = 'Sorry, there was a problem processing your request. Please try again.';
      setResponseMessage(errReply);
      speak(errReply);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={() => {
            stopSpeaking();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Voice-Assisted Elderly Companion</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            How can I help you today?
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Speak naturally or tap any of the large assistance buttons below
          </p>
        </div>

        {/* Animated Microphone Hub */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="relative">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                <div className="absolute -inset-3 rounded-full bg-emerald-300 opacity-40 animate-pulse"></div>
              </>
            )}
            <button
              onClick={toggleListening}
              disabled={!supported}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                isListening
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </button>
          </div>

          <div className="mt-4 text-center">
            <span className={`text-sm font-bold uppercase tracking-wider ${
              isListening ? 'text-rose-600 animate-pulse' : 'text-slate-600'
            }`}>
              {isListening ? 'Listening to your voice...' : 'Tap the microphone to speak'}
            </span>
            {transcript && (
              <p className="mt-2 text-sm italic text-slate-500 font-medium max-w-md">
                "{transcript}"
              </p>
            )}
          </div>
        </div>

        {/* Spoken Response Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 relative">
          <div className="flex items-start justify-between gap-2">
            <p className="text-slate-800 text-base sm:text-lg leading-relaxed font-medium">
              {responseMessage}
            </p>
            {isSpeaking ? (
              <button
                onClick={stopSpeaking}
                title="Stop Audio"
                className="p-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 flex-shrink-0"
              >
                <VolumeX className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => speak(responseMessage)}
                title="Read Aloud"
                className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex-shrink-0"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Accessible Visible Alternative Chips (Accessible for all elderly users) */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Quick Assistance Buttons
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => handleCommand('What medicines do I have today?')}
              className="flex items-center space-x-2 text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-800 text-sm font-semibold transition-colors"
            >
              <Pill className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>"What medicines today?"</span>
            </button>

            <button
              onClick={() => handleCommand('Show my next appointment')}
              className="flex items-center space-x-2 text-left p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-800 text-sm font-semibold transition-colors"
            >
              <Calendar className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span>"Show next appointment"</span>
            </button>

            <button
              onClick={() => handleCommand('Mark my medicine as taken')}
              className="flex items-center space-x-2 text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-800 text-sm font-semibold transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>"Mark medicine taken"</span>
            </button>

            <button
              onClick={() => handleCommand('Read daily summary')}
              className="flex items-center space-x-2 text-left p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-slate-800 text-sm font-semibold transition-colors"
            >
              <Volume2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>"Read care summary"</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
