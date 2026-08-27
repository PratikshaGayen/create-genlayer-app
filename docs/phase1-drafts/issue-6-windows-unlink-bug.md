# Issue 6 — `gltest.direct.loader._inject_message_to_fd0` raises `WinError 32` on Windows, breaking every direct-mode test

**Repo:** `genlayerlabs/genlayer-test`
**Severity:** High (every Windows user of `gltest` direct-mode tests hits this on first run)
**Targets:** `gltest/direct/loader.py:293` (the `os.unlink(path)` inside the `finally` block of `_inject_message_to_fd0`)

## Problem

`gltest.direct.pytest_plugin.direct_deploy` calls
`gltest.direct.loader.deploy_contract`, which calls
`gltest.direct.loader._inject_message_to_fd0`. That function builds a
GenLayer message, encodes it with `genlayer.py.calldata.encode`, writes
the bytes to a `tempfile.mkstemp()` file, and then:

```python
original_stdin = os.dup(0)
vm._original_stdin_fd = original_stdin
os.dup2(fd, 0)
…
finally:
    os.close(fd)
    os.unlink(path)        # ← fails on Windows
```

On Linux, `os.unlink(path)` succeeds even though `fd` is still open
(an unlinked file with an open fd is a normal POSIX state). On
Windows, the same call raises:

```
PermissionError: [WinError 32] The process cannot access the file
because it is being used by another process:
'C:\\Users\\…\\AppData\\Local\\Temp\\tmpXXXXXX'
```

The error propagates out of `deploy_contract` and turns into a test
failure on every `direct_deploy(…)` call. No direct-mode test can pass
on Windows until this is fixed.

The temp file is in `%TEMP%` either way; the only thing the `os.unlink`
buys is a cleaner temp directory in the happy path. Losing it on
Windows is harmless; failing the test is not.

## Repro (Windows 11, Python 3.14.3, genlayer-test 0.29.2)

```python
# tests/direct/test_x.py
def test_smoke(direct_vm, direct_deploy):
    direct_deploy("contracts/anything.py")
```

```text
$env:PYTHONIOENCODING = "utf-8"
pytest tests/direct/ -v
…
collected 5 items
tests/direct/test_x.py::test_smoke FAILED [100%]
…
> contract = direct_deploy("contracts/anything.py")
…
File "…\gltest\direct\loader.py", line 293, in _inject_message_to_fd0
    os.unlink(path)
PermissionError: [WinError 32] The process cannot access the file because
it is being used by another process:
'C:\\Users\\PRATIK~1\\AppData\\Local\\Temp\\tmpXXXXXXXX'
```

## Suggested fix (one-line)

Wrap the `os.unlink` in a `try/except OSError: pass`, or — cleaner —
move the `os.unlink(path)` *out* of the `finally` block and into the
*outer* `deploy_contract` after the contract has been loaded and the
stdin has been restored, where it can succeed on Windows because the
dup2'd fd has been closed.

Minimal patch (matches the working pattern in
[`create-genlayer-app` `tests/direct/conftest.py`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/templates/minimal/tests/direct/conftest.py)):

```python
finally:
    os.close(fd)
    try:
        os.unlink(path)
    except OSError:
        # POSIX unlinks a file with an open fd; Windows does not.
        # The temp file is in %TEMP% and will be cleaned by the OS.
        pass
```

## Why this is its own issue, not part of the "template defects" series

Issues 1–5 are about the contents of `genlayer-cli/templates/default/`.
This one is in `genlayerlabs/genlayer-test` and surfaces in *every*
direct-mode test on Windows, regardless of which contract or template
shipped it. Filing it on the same repo as the previous five would
bounce a maintainer's "this isn't our code" objection. It belongs on
`genlayer-test`.

## Why this belongs upstream, not just in our templates

`create-genlayer-app`'s templates do carry a local workaround
(`templates/minimal/tests/direct/conftest.py`, linked above), because our
generated projects need to pass on Windows today. It is deliberately a thin
`try/except OSError` wrap around the *original* function — not a
reimplementation of its internals — precisely to avoid the vendored-plumbing
anti-pattern this project exists to eliminate (see `tools/calldata.py` and
friends in the current `genlayer new` output).

But every Windows user of `gltest` direct-mode tests hits this bug
independently of which template or contract they're using — it is not
specific to our project. A template-level wrap is a stopgap; the eight
failing lines should be fixed once, upstream, so every `gltest` user on
Windows benefits without needing to know this workaround exists.
