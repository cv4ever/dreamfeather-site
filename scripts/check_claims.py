"""Fail on absolute privacy claims and on prices that differ from the Play price. Standard library only.

Copy of sleep-tracker/scripts/check_claims.py: change PRICE in both when the Play price changes.
Usage: python scripts/check_claims.py FILE...
"""

import re
import sys
from pathlib import Path

# US price of the `lifetime_unlock` product in Play Console (sleep-tracker/docs/play-launch.md, section 3).
PRICE = "9.99"

BANNED = re.compile(
    r"nothing leaves|never leaves? your phone|collects no data|collects nothing|nothing collected"
    r"|everything stays on your phone|never transmits",
    re.IGNORECASE,
)
PRICE_AT = re.compile(r'(?:US)?\$\s?(\d+(?:\.\d\d)?)|"price":\s*"(\d+(?:\.\d\d)?)"')


def problems(name, text):
    for number, line in enumerate(text.splitlines(), 1):
        for match in BANNED.finditer(line):
            yield (f"{name}:{number}: absolute claim '{match.group()}'. State what is stored on the phone "
                   "and name the optional services (Google Play purchases, speech, exports, Health Connect).")
        for match in PRICE_AT.finditer(line):
            price = match.group(1) or match.group(2)
            if price not in ("0", PRICE):
                yield f"{name}:{number}: price {price} is not the Play price {PRICE}."


def main(paths):
    found = [p for path in paths for p in problems(path, Path(path).read_text(encoding="utf-8"))]
    print("\n".join(found) if found else f"{len(paths)} files: claims and prices ok")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
