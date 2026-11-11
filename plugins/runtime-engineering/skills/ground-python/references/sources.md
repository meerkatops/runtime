# Sources: the Python pages our claims rest on

Read each page live, one fetch per page. `https://docs.python.org/3/` shows the newest release; put the repo's version in its place, as `https://docs.python.org/3.14/`.

## Versions and what changed

- https://docs.python.org/3/whatsnew/ — every release's notes; read the repo's version and the one after it.
- https://docs.python.org/3/howto/free-threading-python.html — the free-threaded build: what it is, its cost, and extensions.
- https://docs.python.org/3/howto/annotations.html — reading annotations across versions.

## Style and typing

- https://peps.python.org/pep-0008/ — layout, naming, imports, exceptions, `with`, comparisons.
- https://peps.python.org/pep-0020/ — the principles.
- https://typing.python.org/en/latest/ — the typing specification and the list of checkers.
- https://typing.python.org/en/latest/reference/best_practices.html — unions, builtins over aliases, abstract arguments, concrete returns.
- https://docs.python.org/3/library/typing.html — the module; `TypeIs`, `ReadOnly`, `Protocol`, `TypedDict`.
- https://peps.python.org/pep-0484/ — type hints; the runtime checks nothing.
- https://peps.python.org/pep-0695/ — the `type` statement and bracketed type parameters.

## Packaging and environments

- https://packaging.python.org/en/latest/tutorials/packaging-projects/ — a package from `pyproject.toml` to a wheel, and the backends.
- https://packaging.python.org/en/latest/guides/writing-pyproject-toml/ — the three tables, `requires-python`, dependencies, `[project.scripts]`.
- https://packaging.python.org/en/latest/specifications/pyproject-toml/ — the specification.
- https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/ — why `src/`.
- https://packaging.python.org/en/latest/specifications/inline-script-metadata/ — `# /// script` for a single file.
- https://packaging.python.org/en/latest/guides/packaging-binary-extensions/ — extension modules, including Rust.
- https://docs.python.org/3/library/venv.html — virtual environments.
- https://packaging.python.org/en/latest/specifications/dependency-groups/ and https://pip.pypa.io/en/stable/cli/pip_install/ — `[dependency-groups]` for development tools, and `--group` to install one.

## The gate's tools

Third party; the commands the gate runs are in the coding-rulebook's Python tool gate.

- https://docs.astral.sh/ruff/settings/, https://docs.astral.sh/ruff/linter/ and https://docs.astral.sh/ruff/rules/ — ruff's `pyproject.toml` tables, rule selection and every rule.
- https://microsoft.github.io/pyright/configuration.md — `[tool.pyright]` and `typeCheckingMode`.
- https://docs.pytest.org/en/stable/reference/customize.html, https://docs.pytest.org/en/stable/explanation/goodpractices.html and https://docs.pytest.org/en/stable/reference/exit-codes.html — `[tool.pytest]`, test discovery and exit codes.

## Standard library

- https://docs.python.org/3/tutorial/errors.html and https://docs.python.org/3/library/exceptions.html — raising, chaining, groups, notes.
- https://docs.python.org/3/howto/logging.html — when to log, print or raise; libraries and handlers.
- https://docs.python.org/3/library/dataclasses.html — fields, defaults, `frozen`, `slots`, `kw_only`.
- https://docs.python.org/3/library/pathlib.html — paths.
- https://docs.python.org/3/library/asyncio-dev.html and https://docs.python.org/3/library/asyncio-task.html — blocking, threads, `TaskGroup`, task references.
- https://docs.python.org/3/library/threading.html and https://docs.python.org/3/glossary.html — the GIL, threads against processes.
- https://docs.python.org/3/tutorial/modules.html — imports, `__main__`, packages.
- https://docs.python.org/3/tutorial/floatingpoint.html and https://docs.python.org/3/faq/programming.html — the traps.
- https://docs.python.org/3/reference/lexical_analysis.html — strings, f-strings, t-strings.

## Model files, the Hub and offline use

- https://huggingface.co/docs/huggingface_hub/guides/download — `hf_hub_download`, `snapshot_download`, `revision`, `local_dir`.
- https://huggingface.co/docs/huggingface_hub/package_reference/file_download — the download functions' parameters.
- https://huggingface.co/docs/huggingface_hub/guides/manage-cache — where the cache is and how it is laid out.
- https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables — `HF_HOME`, `HF_HUB_CACHE`, `HF_HUB_OFFLINE`, telemetry.
- https://huggingface.co/docs/transformers/installation — the cache, offline mode, `local_files_only`.

## Loading weights safely

- https://docs.python.org/3/library/pickle.html — why unpickling untrusted data is unsafe.
- https://docs.pytorch.org/docs/stable/generated/torch.load.html and https://docs.pytorch.org/docs/stable/notes/serialization.html — `weights_only`, its limits and its allowlist.
- https://huggingface.co/docs/safetensors/index — the safetensors format.
- https://huggingface.co/docs/hub/security-pickle — pickle on the Hub and what its scanner covers.
- https://huggingface.co/docs/transformers/models — safetensors by default, `dtype`, `trust_remote_code` with a pinned `revision`.
- https://huggingface.co/docs/transformers/main_classes/model — every `from_pretrained()` parameter.
- https://scikit-learn.org/stable/model_persistence.html — ONNX, skops, pickle, joblib compared.

## Inference: pipelines, tokenizers, translation, generation

- https://huggingface.co/docs/transformers/pipeline_tutorial and https://huggingface.co/docs/transformers/main_classes/pipelines — tasks, `device`, `dtype`, batching.
- https://huggingface.co/docs/transformers/main/en/preprocessing and https://huggingface.co/docs/transformers/fast_tokenizers — the tokenizer that belongs to a model.
- https://huggingface.co/docs/transformers/main/en/pad_truncation — padding and truncation.
- https://huggingface.co/docs/transformers/model_doc/marian — MarianMT and OPUS-MT names, language codes, target prefixes.
- https://huggingface.co/docs/transformers/llm_tutorial — `generate()`, its defaults and common mistakes.
- https://huggingface.co/docs/transformers/quantization/overview and https://huggingface.co/docs/hub/gguf — lower-precision weights and the GGUF file.
- https://docs.pytorch.org/docs/stable/generated/torch.autograd.grad_mode.inference_mode.html — inference mode against `no_grad` and `eval()`.

## Devices, dtypes and installs

- https://docs.pytorch.org/docs/stable/notes/cuda.html and https://docs.pytorch.org/docs/stable/notes/mps.html — CUDA and Apple GPU use, device-agnostic code, timing.
- https://docs.pytorch.org/docs/stable/generated/torch.set_default_dtype.html and https://numpy.org/doc/stable/user/basics.types.html — default dtypes, casting, overflow.
- https://pytorch.org/get-started/locally/ — which wheel for which CPU or CUDA build.
- https://packaging.python.org/en/latest/specifications/pylock-toml/ — the lockfile format.

## Reproducibility

- https://docs.pytorch.org/docs/stable/notes/randomness.html and https://docs.pytorch.org/docs/stable/generated/torch.use_deterministic_algorithms.html — seeds, deterministic algorithms, what is not guaranteed.
- https://numpy.org/doc/stable/reference/random/index.html — `default_rng`, `Generator`, the legacy global state.
- https://docs.python.org/3/library/random.html — seeding the standard library.
- https://scikit-learn.org/stable/common_pitfalls.html — `random_state`, and leakage.

## Arrays and dataframes

- https://numpy.org/doc/stable/user/whatisnumpy.html and https://numpy.org/doc/stable/user/basics.broadcasting.html — vectorization and broadcasting.
- https://pandas.pydata.org/docs/user_guide/basics.html and https://pandas.pydata.org/docs/user_guide/enhancingperf.html — iteration, `apply`, and what to do instead.
- https://pandas.pydata.org/docs/user_guide/scale.html — columns, dtypes and chunks for large data.
- https://pandas.pydata.org/docs/user_guide/migration.html and https://pandas.pydata.org/docs/user_guide/indexing.html — Copy-on-Write and chained assignment.
- https://pandas.pydata.org/docs/user_guide/pyarrow.html — Arrow-backed columns.
- https://docs.pola.rs/user-guide/concepts/lazy-api/ and https://docs.pola.rs/user-guide/concepts/streaming/ — lazy queries and larger-than-memory runs.
- https://docs.pola.rs/user-guide/expressions/user-defined-python-functions/ — the cost of a Python function in a query.
- https://docs.pola.rs/user-guide/migration/pandas/ — how Polars differs from pandas.
- https://docs.pola.rs/user-guide/io/parquet/ and https://huggingface.co/docs/datasets/about_arrow — Parquet and Arrow.

## Training and evaluation

- https://scikit-learn.org/stable/common_pitfalls.html and https://scikit-learn.org/stable/modules/compose.html — leakage and pipelines.
- https://scikit-learn.org/stable/modules/cross_validation.html — validation sets and cross-validation.

## Embeddings and vector search

- https://scikit-learn.org/stable/modules/metrics.html — cosine similarity against the dot product.
- https://sbert.net/docs/package_reference/sentence_transformer/SentenceTransformer.html — `encode()`, batch size, normalization, `revision`, `local_files_only`.
- https://sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html — the similarity functions.
- https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html — exact and approximate search.

## Export and serving

- https://docs.pytorch.org/docs/stable/onnx.html — `torch.onnx.export`.
- https://huggingface.co/docs/transformers/serialization and https://huggingface.co/docs/optimum-onnx/onnx/usage_guides/export_a_model — exporting a transformers model.
- https://onnxruntime.ai/docs/get-started/with-python.html, https://onnxruntime.ai/docs/api/python/api_summary.html and https://onnxruntime.ai/docs/execution-providers/ — packages, sessions, providers.

## Notebooks

- https://nbformat.readthedocs.io/en/latest/format_description.html — what a notebook file stores.
- https://ipython.readthedocs.io/en/stable/config/extensions/autoreload.html — reloading modules in a session.

