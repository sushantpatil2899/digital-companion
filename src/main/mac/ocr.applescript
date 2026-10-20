-- Reads the text in a picture with Apple's on-device text recognition (the
-- Vision framework), for "Let him read my screen" (src/main/mind/screen.js).
-- Run: osascript ocr.applescript /path/to/picture.png
-- Prints the recognised lines, top to bottom. Nothing leaves the Mac.

use AppleScript version "2.7"
use framework "Foundation"
use framework "Vision"
use scripting additions

on run argv
	set picturePath to item 1 of argv
	set pictureURL to current application's |NSURL|'s fileURLWithPath:picturePath
	set handler to current application's VNImageRequestHandler's alloc()'s initWithURL:pictureURL options:(missing value)
	set request to current application's VNRecognizeTextRequest's alloc()'s init()
	request's setRecognitionLevel:(current application's VNRequestTextRecognitionLevelAccurate)
	request's setUsesLanguageCorrection:true
	set {ok, theError} to handler's performRequests:{request} |error|:(reference)
	if not ok then error (theError's localizedDescription() as text)
	set out to {}
	repeat with observation in (request's results() as list)
		set candidate to (observation's topCandidates:1)'s firstObject()
		if candidate is not missing value then set end of out to (candidate's |string|() as text)
	end repeat
	set AppleScript's text item delimiters to linefeed
	return out as text
end run
