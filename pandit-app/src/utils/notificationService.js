import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";

// Configure notification behavior for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Local pure brass temple bell WAV file (synthesized 528Hz divine ghanti chime)
const TEMPLE_BELL_SOUND = require("../../assets/sounds/temple_bell.wav");
let soundInstance = null;

/**
 * Plays local pure brass temple bell sound
 */
export const playTempleBell = async () => {
  try {
    if (soundInstance) {
      await soundInstance.unloadAsync().catch(() => {});
      soundInstance = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      TEMPLE_BELL_SOUND,
      { shouldPlay: true, volume: 1.0 }
    );
    soundInstance = sound;
  } catch (err) {
    console.warn("Failed to play local temple bell sound:", err);
  }
};

/**
 * Plays temple bell chime followed by refined Hindi Text-to-Speech:
 * "नमस्ते! Panditoo में, आपके लिए नई बुकिंग आई है।"
 */
export const speakBookingNotification = async (customText) => {
  // 1. Play authentic local brass temple bell sound
  await playTempleBell();

  // 2. Wait 900ms for temple bell chime to echo, then speak with clear Hindi accent
  setTimeout(() => {
    const textToSpeak = customText || "नमस्ते! Panditoo में, आपके लिए नई बुकिंग आई है।";
    try {
      Speech.stop();
      Speech.speak(textToSpeak, {
        language: "hi-IN",
        pitch: 1.05,
        rate: 0.88,
      });
    } catch (err) {
      console.warn("Speech error:", err);
    }
  }, 900);
};

/**
 * Triggers native system notification banner
 */
export const triggerLocalNotification = async (title, body) => {
  try {
    const defaultTitle = "🔔 Panditoo - नई बुकिंग!";
    const defaultBody = "नमस्ते! Panditoo में आपके लिए नई बुकिंग आई है।";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || defaultTitle,
        body: body || defaultBody,
        sound: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("Local notification error:", err);
  }
};

/**
 * Triggers Temple Bell Chime, Voice & Banner alert for new booking arrival
 */
export const notifyNewBookingArrival = (poojaName) => {
  const hindiText = poojaName 
    ? `नमस्ते! Panditoo में, ${poojaName} की नई बुकिंग आई है।`
    : "नमस्ते! Panditoo में, आपके लिए नई बुकिंग आई है।";

  speakBookingNotification(hindiText);
  triggerLocalNotification("🔔 Panditoo - नई बुकिंग!", hindiText);
};
