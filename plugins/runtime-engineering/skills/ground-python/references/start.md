# Decide at the start

What a new Python repo settles before its first file. Each answer goes in `pyproject.toml`, the folder layout and the README, so a builder never has to choose. Each line names the page that says why.

| Decision | Our answer | Page |
|---|---|---|
| Version | The newest stable release that every package the project depends on supports, as the floor; never move ahead of a dependency: `requires-python` declares the minimum version supported and pins nothing; the interpreter a machine runs is set by the environment tool the README names | https://docs.python.org/3/whatsnew/ and https://packaging.python.org/en/latest/guides/writing-pyproject-toml/ |
| Manifest | `pyproject.toml` with `[build-system]` (always present), `[project]`, `[tool]` per tool | https://packaging.python.org/en/latest/guides/writing-pyproject-toml/ and https://packaging.python.org/en/latest/specifications/pyproject-toml/ |
| Layout | `src/<package>/` so the installed package is what runs, never the working copy; `tests/` beside it | https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/ |
| Environment | `python -m venv`, first party; a project manager with a lockfile is a third-party choice the README records | https://docs.python.org/3/library/venv.html |
| Build backend | One of the backends the tutorial lists, named in `[build-system]` | https://packaging.python.org/en/latest/tutorials/packaging-projects/ |
| Commands | `[project.scripts]` entries; a single file declares `# /// script` metadata | https://packaging.python.org/en/latest/guides/writing-pyproject-toml/ and https://packaging.python.org/en/latest/specifications/inline-script-metadata/ |
| Typing | Annotations everywhere; no checker is first party and the runtime checks nothing, so `pyproject.toml` configures pyright with `typeCheckingMode = "strict"` in `[tool.pyright]`; the default mode is `standard` | https://peps.python.org/pep-0484/, https://typing.python.org/en/latest/ and https://microsoft.github.io/pyright/configuration.md |
| Lint and format | ruff, third party, does both: `ruff format --check` and `ruff check`, with `extend-select` in `[tool.ruff.lint]` adding rule families to the default set, where `select` would replace it | https://docs.astral.sh/ruff/settings/ and https://docs.astral.sh/ruff/linter/ |
| Tests | pytest, third party, configured in `[tool.pytest]` (native TOML since pytest 9.0) with `testpaths = ["tests"]`; it collects `test_*.py` and `*_test.py`, and exits 5 when it collects none | https://docs.pytest.org/en/stable/reference/customize.html, https://docs.pytest.org/en/stable/explanation/goodpractices.html and https://docs.pytest.org/en/stable/reference/exit-codes.html |
| Development tools | ruff, pyright and pytest are pinned in a `[dependency-groups]` `dev` group, which is not part of the built package's metadata; `pip install -e . --group dev` installs it. They are the tools the coding-rulebook's Python tool gate runs; the gate's commands live there | https://packaging.python.org/en/latest/specifications/dependency-groups/ and https://pip.pypa.io/en/stable/cli/pip_install/ |
| Logging | `getLogger(__name__)` per module; a library adds only a `NullHandler`; the entry configures the root | https://docs.python.org/3/howto/logging.html |
| Errors | `Exception` subclasses ending in `Error`; `raise ... from`; `ExceptionGroup` and `except*` for several at once; `add_note` to enrich | https://docs.python.org/3/tutorial/errors.html and https://docs.python.org/3/library/exceptions.html |
| Concurrency | asyncio for I/O with `TaskGroup`; threads for I/O under the GIL; processes for CPU | https://docs.python.org/3/library/asyncio-dev.html and https://docs.python.org/3/library/asyncio-task.html and https://docs.python.org/3/glossary.html |
| Native speed | A Rust extension module where a pure function is measured slow; the Python stays the interface | https://packaging.python.org/en/latest/guides/packaging-binary-extensions/ |

## A repo that does data or machine learning work

It settles these too, and the README records each answer.

| Decision | Our answer | Page |
|---|---|---|
| Array and dataframe library | NumPy for arrays; one dataframe library per repo, named in the README: Polars lazy frames for new work, pandas where a dependency needs it | https://numpy.org/doc/stable/user/whatisnumpy.html and https://docs.pola.rs/user-guide/concepts/lazy-api/ and https://pandas.pydata.org/docs/user_guide/scale.html |
| Data files | Parquet for tables, read lazily and by column; CSV only at the boundary, with its dtypes named | https://docs.pola.rs/user-guide/io/parquet/ and https://pandas.pydata.org/docs/user_guide/scale.html |
| Model storage | One model directory, named in config and outside the package; one fetch command fills it with `snapshot_download(..., revision=<full commit hash>, local_dir=...)`; the run sets `HF_HUB_OFFLINE=1` | https://huggingface.co/docs/huggingface_hub/guides/download and https://huggingface.co/docs/transformers/installation |
| Pinned revisions | A checked-in manifest lists each model's repo id and full commit hash | https://huggingface.co/docs/huggingface_hub/guides/download |
| Weight format | safetensors; a pickle-based file is loaded only when we wrote it | https://huggingface.co/docs/safetensors/index and https://docs.python.org/3/library/pickle.html |
| GPU and CPU wheels | The PyTorch build (CPU or a CUDA version) comes from the index its install selector names; `onnxruntime` or `onnxruntime-gpu`, never both; the README names the build for each machine | https://pytorch.org/get-started/locally/ and https://onnxruntime.ai/docs/get-started/with-python.html |
| Lockfile | A lockfile with file hashes is checked in, so a result can be rerun on the same versions; `pylock.toml` is the standard format | https://packaging.python.org/en/latest/specifications/pylock-toml/ |
| Device and dtype | Read from config and resolved once to a `torch.device` and a dtype that are passed down | https://docs.pytorch.org/docs/stable/notes/cuda.html and https://huggingface.co/docs/transformers/main_classes/model |
| Seeds | One seed in config, applied to every generator at the entry point | https://docs.pytorch.org/docs/stable/notes/randomness.html and https://numpy.org/doc/stable/reference/random/index.html |
| Notebooks | In `notebooks/`, importing the installed package; logic lives in `src/` | https://docs.python.org/3/tutorial/modules.html and https://nbformat.readthedocs.io/en/latest/format_description.html |
| Serving format | ONNX on ONNX Runtime where the model exports and its outputs validate; the providers list comes from config | https://huggingface.co/docs/transformers/serialization and https://onnxruntime.ai/docs/api/python/api_summary.html |

## Traps the pages name

- A default argument is created once; a mutable default is shared across calls. https://docs.python.org/3/tutorial/controlflow.html
- A `@dataclass` field with a mutable default raises; use `default_factory`. https://docs.python.org/3/library/dataclasses.html
- A lambda in a loop reads its variable when called, not when defined. https://docs.python.org/3/faq/programming.html
- `is` tests identity; use it for `None` and other singletons only. https://peps.python.org/pep-0008/
- `0.1 + 0.1 + 0.1 == 0.3` is false; compare with `math.isclose`. https://docs.python.org/3/tutorial/floatingpoint.html
- `from a import b` fails inside a circular import; `import a` and defer the access. https://docs.python.org/3/faq/programming.html
- A bare `except:` catches `SystemExit` and `KeyboardInterrupt`. https://peps.python.org/pep-0008/
- An f-string cannot be a docstring, and logging takes `%` arguments, not f-strings. https://docs.python.org/3/reference/lexical_analysis.html and https://docs.python.org/3/howto/logging.html
- A bare task with no reference kept may be collected mid-run. https://docs.python.org/3/library/asyncio-task.html
- The free-threaded build is a separate binary; a C extension may re-enable the GIL on import. https://docs.python.org/3/howto/free-threading-python.html
- Loading a pickle runs code: `pickle.load`, `torch.load(weights_only=False)` and `joblib.load` can all execute what the file says. https://docs.python.org/3/library/pickle.html and https://docs.pytorch.org/docs/stable/notes/serialization.html and https://scikit-learn.org/stable/model_persistence.html
- `trust_remote_code=True` runs the model repo's own Python; unpinned, that code can change between runs. https://huggingface.co/docs/transformers/models
- A model loaded by name with no `revision` follows `main`, and a cached file still triggers an HTTP check. https://huggingface.co/docs/huggingface_hub/guides/download and https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
- The Hub cache defaults to `~/.cache/huggingface/hub`, in the home directory, outside the repo and shared by every project. https://huggingface.co/docs/huggingface_hub/guides/manage-cache
- A tokenizer from a different checkpoint than the model splits text differently and maps it to different ids. https://huggingface.co/docs/transformers/main/en/preprocessing
- `generate()` stops at 20 new tokens unless `max_new_tokens` or the model's generation config says otherwise. https://huggingface.co/docs/transformers/llm_tutorial
- A multilingual OPUS-MT model takes its target language from a `>>code<<` prefix on each source text; nothing else sets it. https://huggingface.co/docs/transformers/model_doc/marian
- `torch.inference_mode()` leaves dropout and batch normalization in training mode; `model.eval()` is a separate call. https://docs.pytorch.org/docs/stable/generated/torch.autograd.grad_mode.inference_mode.html
- PyTorch defaults to `float32` and NumPy to `float64`; a model loads in the dtype it was saved in, which may be half precision. https://docs.pytorch.org/docs/stable/generated/torch.set_default_dtype.html and https://numpy.org/doc/stable/user/basics.types.html and https://huggingface.co/docs/transformers/main_classes/model
- A NumPy integer cast between arrays that overflows, `arr.astype(np.int8)`, wraps by C rules with no error; `np.int8(300)`, an out-of-bounds Python integer, is refused since NumPy 2.0. https://numpy.org/doc/stable/user/basics.types.html and https://numpy.org/doc/stable/release/2.0.0-notes.html
- pandas chained assignment, `df[mask]["col"] = value`, never updates `df`; use `df.loc[mask, "col"] = value`. https://pandas.pydata.org/docs/user_guide/indexing.html and https://pandas.pydata.org/docs/user_guide/migration.html
- A pandas integer column with a missing value becomes float `NaN` unless it uses a nullable or Arrow dtype. https://docs.pola.rs/user-guide/migration/pandas/ and https://pandas.pydata.org/docs/user_guide/pyarrow.html
- A scaler or encoder fitted before the train and test split has seen the test data. https://scikit-learn.org/stable/common_pitfalls.html
- `random_state=None`, the scikit-learn default, gives a different split or model on each call. https://scikit-learn.org/stable/common_pitfalls.html
- The same seed does not give the same result on a different device, platform or PyTorch release. https://docs.pytorch.org/docs/stable/notes/randomness.html
- Timing a GPU call without `torch.cuda.synchronize()` measures the launch, not the work. https://docs.pytorch.org/docs/stable/notes/cuda.html
- A dot-product score over embeddings that were not normalized is not cosine similarity. https://scikit-learn.org/stable/modules/metrics.html
- A scikit-learn model saved with pickle or joblib needs the same package versions to load. https://scikit-learn.org/stable/model_persistence.html
- A committed notebook carries its cell outputs, data included. https://nbformat.readthedocs.io/en/latest/format_description.html
