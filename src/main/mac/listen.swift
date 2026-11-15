// Phase 11: Apple's on-device speech recognition for Filo.
//
//   companion-listen <file.wav> [locale] [hint ...]
//
// Turns one short recording into text with SFSpeechRecognizer, on this Mac
// only (requiresOnDeviceRecognition: the audio never leaves it). Hints are
// words that help it hear right (character names, "tic-tac-toe"). Prints one
// line of JSON: {"text": "..."} or {"error": "...", "code": "..."}.
//
// Built by scripts/build-helpers.js with an Info.plist inside the binary,
// because macOS needs NSSpeechRecognitionUsageDescription before it asks for
// Speech Recognition permission (the prompt is shown for Filo).

import Foundation
import Speech

func reply(_ object: [String: String]) -> Never {
    let data = (try? JSONSerialization.data(withJSONObject: object)) ?? Data("{\"error\":\"encoding\"}".utf8)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
    exit(object["error"] == nil ? 0 : 1)
}

let args = CommandLine.arguments
guard args.count >= 2 else { reply(["error": "usage: companion-listen <file.wav> [locale] [hint ...]", "code": "usage"]) }
let file = URL(fileURLWithPath: args[1])
let locale = Locale(identifier: args.count >= 3 && !args[2].isEmpty ? args[2] : Locale.current.identifier)
let hints = args.count > 3 ? Array(args[3...]) : []

// Permission (asked once; macOS shows the prompt for Filo).
let authorized = DispatchSemaphore(value: 0)
var status = SFSpeechRecognizer.authorizationStatus()
if status == .notDetermined {
    SFSpeechRecognizer.requestAuthorization { s in
        status = s
        authorized.signal()
    }
    _ = authorized.wait(timeout: .now() + 120)
}
switch status {
case .authorized: break
case .denied: reply(["error": "Speech Recognition isn’t allowed for Filo (System Settings → Privacy & Security → Speech Recognition)", "code": "denied"])
case .restricted: reply(["error": "Speech Recognition is restricted on this Mac", "code": "restricted"])
default: reply(["error": "Speech Recognition permission wasn’t given", "code": "notDetermined"])
}

guard let recognizer = SFSpeechRecognizer(locale: locale) else {
    reply(["error": "no speech recognizer for \(locale.identifier)", "code": "locale"])
}
guard recognizer.supportsOnDeviceRecognition else {
    reply(["error": "on-device recognition isn’t available for \(locale.identifier) (System Settings → Keyboard → Dictation: download the language)", "code": "offline"])
}
guard recognizer.isAvailable else { reply(["error": "the speech recognizer isn’t available right now", "code": "unavailable"]) }

// Results arrive on this queue, so the main thread can wait for them.
recognizer.queue = OperationQueue()
let request = SFSpeechURLRecognitionRequest(url: file)
request.requiresOnDeviceRecognition = true
request.shouldReportPartialResults = false
request.taskHint = .dictation
if #available(macOS 13.0, *) { request.addsPunctuation = true }
request.contextualStrings = hints

let done = DispatchSemaphore(value: 0)
var text: String? = nil
var failure: String? = nil
let task = recognizer.recognitionTask(with: request) { result, error in
    if let result = result, result.isFinal {
        text = result.bestTranscription.formattedString
        done.signal()
    } else if let error = error {
        failure = error.localizedDescription
        done.signal()
    }
}
if done.wait(timeout: .now() + 30) == .timedOut {
    task.cancel()
    reply(["error": "speech recognition took too long", "code": "timeout"])
}
if let text = text { reply(["text": text]) }
// "No speech detected" is an error to the recognizer, an empty result to us.
if let failure = failure, failure.lowercased().contains("no speech") { reply(["text": ""]) }
reply(["error": failure ?? "nothing recognized", "code": "failed"])
