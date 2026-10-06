#pragma once

#include <stddef.h>
#include <stdint.h>
#include <string.h>

struct DashboardPageSlice {
  size_t offset = 0;
  size_t length = 0;
};

class DashboardPageScanner {
 public:
  explicit DashboardPageScanner(uint8_t targetIndex)
      : targetIndex_(targetIndex) {}

  bool consume(char character) {
    const size_t position = position_++;

    if (inPages_) return consumePageArray(character, position);

    if (inString_) {
      if (escaped_) {
        escaped_ = false;
        appendKeyCharacter(character);
      } else if (character == '\\') {
        escaped_ = true;
      } else if (character == '"') {
        inString_ = false;
        if (readingKey_) {
          readingKey_ = false;
          keyMatchesPages_ = strcmp(key_, "pages") == 0;
        }
      } else {
        appendKeyCharacter(character);
      }
      return false;
    }

    if (awaitingPagesColon_) {
      if (isWhitespace(character)) return false;
      if (character == ':') {
        awaitingPagesColon_ = false;
        awaitingPagesArray_ = true;
        return false;
      }
      resetKeyMatch();
    }
    if (awaitingPagesArray_) {
      if (isWhitespace(character)) return false;
      if (character == '[') {
        awaitingPagesArray_ = false;
        inPages_ = true;
        return false;
      }
      resetKeyMatch();
    }

    if (character == '"') {
      inString_ = true;
      escaped_ = false;
      readingKey_ = objectDepth_ == 1 && arrayDepth_ == 0 && expectingKey_;
      keyLength_ = 0;
      key_[0] = '\0';
      return false;
    }
    if (character == '{') {
      ++objectDepth_;
      if (objectDepth_ == 1 && arrayDepth_ == 0) expectingKey_ = true;
    } else if (character == '}') {
      if (objectDepth_ > 0) --objectDepth_;
      expectingKey_ = false;
    } else if (character == '[') {
      ++arrayDepth_;
    } else if (character == ']') {
      if (arrayDepth_ > 0) --arrayDepth_;
    } else if (objectDepth_ == 1 && arrayDepth_ == 0) {
      if (character == ':' && keyMatchesPages_) {
        awaitingPagesColon_ = false;
        awaitingPagesArray_ = true;
        keyMatchesPages_ = false;
      } else if (character == ',') {
        expectingKey_ = true;
      } else if (!isWhitespace(character) && expectingKey_) {
        expectingKey_ = false;
      }
    }

    if (!inString_ && keyMatchesPages_) awaitingPagesColon_ = true;
    return false;
  }

  bool found() const { return found_; }
  DashboardPageSlice slice() const { return slice_; }

 private:
  static bool isWhitespace(char character) {
    return character == ' ' || character == '\t' || character == '\r' ||
           character == '\n';
  }

  void appendKeyCharacter(char character) {
    if (!readingKey_ || keyLength_ + 1 >= sizeof(key_)) return;
    key_[keyLength_++] = character;
    key_[keyLength_] = '\0';
  }

  void resetKeyMatch() {
    awaitingPagesColon_ = false;
    awaitingPagesArray_ = false;
    keyMatchesPages_ = false;
  }

  bool consumePageArray(char character, size_t position) {
    if (pageInString_) {
      if (pageEscaped_) {
        pageEscaped_ = false;
      } else if (character == '\\') {
        pageEscaped_ = true;
      } else if (character == '"') {
        pageInString_ = false;
      }
      return false;
    }
    if (character == '"') {
      pageInString_ = true;
      return false;
    }
    if (character == '{') {
      if (pageObjectDepth_ == 0) {
        if (pageIndex_ == targetIndex_) slice_.offset = position;
        ++pageIndex_;
      }
      ++pageObjectDepth_;
      return false;
    }
    if (character == '}' && pageObjectDepth_ > 0) {
      --pageObjectDepth_;
      if (pageObjectDepth_ == 0 && pageIndex_ - 1 == targetIndex_) {
        slice_.length = position - slice_.offset + 1;
        found_ = true;
        return true;
      }
    }
    return false;
  }

  uint8_t targetIndex_;
  size_t position_ = 0;
  uint8_t objectDepth_ = 0;
  uint8_t arrayDepth_ = 0;
  bool inString_ = false;
  bool escaped_ = false;
  bool readingKey_ = false;
  bool expectingKey_ = false;
  bool keyMatchesPages_ = false;
  bool awaitingPagesColon_ = false;
  bool awaitingPagesArray_ = false;
  char key_[12]{};
  size_t keyLength_ = 0;

  bool inPages_ = false;
  bool pageInString_ = false;
  bool pageEscaped_ = false;
  uint8_t pageObjectDepth_ = 0;
  uint8_t pageIndex_ = 0;
  bool found_ = false;
  DashboardPageSlice slice_{};
};
