# What the pages say about writing Python well

Each line names the page that states it. Use a feature only where the repo's `requires-python` supports it. The choices we make on top of these pages, for the machine and for agents, are in the Python section of the coding-rulebook skill in this plugin (`runtime-engineering:coding-rulebook`); check Python work against it too.

## Layout and names

- Four-space indents, lines near 79 characters, modules `lowercase`, classes `CapWords`, functions and variables `lowercase_with_underscores`, constants `UPPER_CASE`; absolute imports, one per line, no wildcard imports; consistency within the project outranks the guide. https://peps.python.org/pep-0008/
- A module is importable without side effects; it runs only under `if __name__ == "__main__":`. https://docs.python.org/3/tutorial/modules.html

## Types

- Annotate every function. The interpreter checks nothing, so a type checker runs in CI. https://peps.python.org/pep-0484/ and https://typing.python.org/en/latest/
- Bracketed type parameters, `def first[T](items: Sequence[T]) -> T`, and the `type` statement for aliases. https://peps.python.org/pep-0695/ and https://docs.python.org/3/library/typing.html
- `str | None` over `Optional`; builtin generics `list[str]` over `typing.List`; `collections.abc` types for arguments and concrete types for returns; `object` where anything is accepted. https://typing.python.org/en/latest/reference/best_practices.html
- `TypeIs` for a narrowing predicate, `ReadOnly` for a `TypedDict` field that is not written, `Protocol` for structural typing. https://docs.python.org/3/library/typing.html
- Read annotations with `annotationlib.get_annotations()` on versions that defer them, `inspect.get_annotations()` before that. https://docs.python.org/3/howto/annotations.html

## Data

- A record is a `@dataclass`; a mutable field uses `field(default_factory=...)`; `frozen=True` for a value, `slots=True` to save memory, `kw_only=True` for many fields. https://docs.python.org/3/library/dataclasses.html
- Paths are `pathlib.Path`; `os.path` is the procedural string API. https://docs.python.org/3/library/pathlib.html
- f-strings for formatting at run time; t-strings for a template a consumer renders. https://docs.python.org/3/reference/lexical_analysis.html

## Errors

- Derive from `Exception`, name it `...Error`, raise `from` its cause, and `from None` only to hide a cause on purpose. https://docs.python.org/3/tutorial/errors.html and https://peps.python.org/pep-0008/
- `except` names the types it handles; a `try` body holds only the lines that can raise. https://peps.python.org/pep-0008/
- Several failures at once form an `ExceptionGroup`, handled with `except*`; `add_note()` adds context after the catch. https://docs.python.org/3/tutorial/errors.html and https://docs.python.org/3/library/exceptions.html
- `with` for anything acquired and released; a context manager that does more than acquire and release gets a named function. https://peps.python.org/pep-0008/

## Logging

- `logger = logging.getLogger(__name__)` at module level; `print()` for a command's output; `raise` for an error; a library adds only a `NullHandler` and never configures the root. https://docs.python.org/3/howto/logging.html
- Log with lazy `%` arguments, `logger.info("read %s", path)`, so the string is built only when emitted. https://docs.python.org/3/howto/logging.html

## Concurrency

- Blocking or CPU-bound code never runs on the event loop; hand it to `run_in_executor`. https://docs.python.org/3/library/asyncio-dev.html
- Tasks run under `asyncio.TaskGroup`; a bare `create_task` needs a kept reference or the task may be collected. https://docs.python.org/3/library/asyncio-task.html
- Threads for I/O-bound work; processes for CPU-bound work, since one thread runs bytecode at a time under the GIL. https://docs.python.org/3/glossary.html and https://docs.python.org/3/library/threading.html
- The free-threaded build is a separate binary with a small single-thread cost; a C extension may re-enable the GIL on import. https://docs.python.org/3/howto/free-threading-python.html

## Packaging

- `pyproject.toml` holds `[build-system]`, `[project]` with `requires-python` and `dependencies`, and `[tool]` tables. https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
- `src/<package>/` keeps the working copy off the import path; tests import the installed package. https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/
- A command is a `[project.scripts]` entry; a single-file script declares its needs in a `# /// script` block. https://packaging.python.org/en/latest/guides/writing-pyproject-toml/ and https://packaging.python.org/en/latest/specifications/inline-script-metadata/
- A Rust extension module is a binary extension built by the backend the guide names. https://packaging.python.org/en/latest/guides/packaging-binary-extensions/

## Model files from the Hugging Face Hub

- `revision` takes a branch, a tag, a pull request ref or a commit hash, and the hash must be full length; with none, `main` is fetched, so the files can change between runs. https://huggingface.co/docs/huggingface_hub/guides/download and https://huggingface.co/docs/transformers/main_classes/model
- `snapshot_download()` fetches a whole repo at one revision; `local_dir` copies the repo's file layout into that folder instead of the cache and keeps its bookkeeping in `.cache/huggingface/` there. https://huggingface.co/docs/huggingface_hub/guides/download and https://huggingface.co/docs/huggingface_hub/package_reference/file_download
- The cache is `~/.cache/huggingface/hub` unless `HF_HUB_CACHE`, `HF_HOME` or `cache_dir` moves it; it stores each repo as `snapshots/<commit>/` of links into `blobs/`. https://huggingface.co/docs/huggingface_hub/guides/manage-cache and https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
- A cached file still costs an HTTP request to check for a newer one; `HF_HUB_OFFLINE=1` makes no HTTP calls, reads only the cache and raises when the file is absent. https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
- `local_files_only=True` in `from_pretrained()` loads only local files, and takes a directory path in place of a repo id. A commit hash is served from the cache with no check; a branch or tag contacts the Hub once per load. https://huggingface.co/docs/transformers/installation
- The Hugging Face libraries collect usage telemetry by default; `HF_HUB_DISABLE_TELEMETRY=1` turns it off. https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables

## Loading weights

- Unpickling can run arbitrary code; unpickle only data you trust. https://docs.python.org/3/library/pickle.html
- `torch.load()` unpickles. `weights_only=True`, the default since 2.6, limits it to tensors, primitive types, dictionaries and allowlisted types; it narrows remote code execution and does not stop denial of service. `weights_only=False` can run arbitrary code. https://docs.pytorch.org/docs/stable/generated/torch.load.html and https://docs.pytorch.org/docs/stable/notes/serialization.html
- safetensors stores tensors without pickle and reads them zero-copy; `from_pretrained()` loads the safetensors file when the repo has one, and `use_safetensors` sets the choice. https://huggingface.co/docs/safetensors/index and https://huggingface.co/docs/transformers/models and https://huggingface.co/docs/transformers/main_classes/model
- `trust_remote_code=True` runs modeling code from the model's repo; pass a commit hash as `revision` so that code cannot change after it is read. https://huggingface.co/docs/transformers/models
- The Hub scans pushed files and lists a pickle's imports, and its antivirus scan does not cover pickle exploits; a scan is not a reason to trust a file. https://huggingface.co/docs/hub/security-pickle
- For scikit-learn models, pickle, joblib and cloudpickle can run arbitrary code on load and need the training environment's package versions; skops.io is more secure; ONNX needs no Python environment and cannot rebuild the Python object. https://scikit-learn.org/stable/model_persistence.html

## Inference with transformers

- A pipeline batches only when `batch_size` is set; a batch may be several times faster or slower, depending on hardware, data and model, so measure it. https://huggingface.co/docs/transformers/main_classes/pipelines and https://huggingface.co/docs/transformers/pipeline_tutorial
- Use the tokenizer the model was pretrained with, so text splits the same way and maps to the same ids; `AutoTokenizer.from_pretrained()` resolves it from the model's files. https://huggingface.co/docs/transformers/main/en/preprocessing and https://huggingface.co/docs/transformers/fast_tokenizers
- No padding is applied by default; `padding=True` pads to the longest sequence in the batch and `truncation=True` cuts to the model's maximum length. https://huggingface.co/docs/transformers/main/en/pad_truncation
- MarianMT (OPUS-MT) checkpoints are named `Helsinki-NLP/opus-mt-{src}-{tgt}`, about 298 MB each. A model with several target languages needs a `>>code<<` prefix on the source text: three-letter codes for the newer models, two-letter for the older. https://huggingface.co/docs/transformers/model_doc/marian
- `generate()` returns up to 20 new tokens and decodes greedily unless the model's generation config says otherwise; set `max_new_tokens`. A decoder-only model pads on the left and returns the prompt with the output. https://huggingface.co/docs/transformers/llm_tutorial
- `torch.inference_mode()` turns off autograd tracking with less overhead than `no_grad`; it does not set evaluation mode, so call `model.eval()` too. https://docs.pytorch.org/docs/stable/generated/torch.autograd.grad_mode.inference_mode.html
- Quantization stores weights at lower precision (fp16, int8, int4) to cut memory while trying to keep accuracy. https://huggingface.co/docs/transformers/quantization/overview
- GGUF is one binary file holding the tensors and their metadata, for llama.cpp and similar executors. https://huggingface.co/docs/hub/gguf

## Devices and dtypes

- A pipeline with no `device` takes the first accelerator (CUDA, MPS, XPU) and falls back to CPU; `device="cpu"` forces CPU; `device` and `device_map` cannot be combined. https://huggingface.co/docs/transformers/main_classes/pipelines
- Test for an accelerator with `torch.cuda.is_available()` and `torch.backends.mps.is_available()`; device-agnostic code resolves one `torch.device` up front and passes it on. https://docs.pytorch.org/docs/stable/notes/cuda.html and https://docs.pytorch.org/docs/stable/notes/mps.html
- GPU operations are asynchronous; call `torch.cuda.synchronize()` before reading a timer. https://docs.pytorch.org/docs/stable/notes/cuda.html
- PyTorch's default float is `float32`; NumPy reads a Python `float` as `float64`. https://docs.pytorch.org/docs/stable/generated/torch.set_default_dtype.html and https://numpy.org/doc/stable/user/basics.types.html
- `dtype="auto"`, the default, loads a model in the dtype it was saved in, which may not be the dtype it was trained in; `torch.float16` or `torch.bfloat16` saves memory. https://huggingface.co/docs/transformers/main_classes/model and https://huggingface.co/docs/transformers/pipeline_tutorial
- NumPy integers have a fixed size and follow C casting rules: 300 cast to `int8` becomes 44 with no error. https://numpy.org/doc/stable/user/basics.types.html

## Reproducibility

- PyTorch does not guarantee the same results across releases, platforms, or CPU and GPU, even with the same seed. https://docs.pytorch.org/docs/stable/notes/randomness.html
- Seed each generator in use: `torch.manual_seed()`, `random.seed()` and NumPy's; `DataLoader` workers need `worker_init_fn` and a seeded `generator`. https://docs.pytorch.org/docs/stable/notes/randomness.html
- `torch.use_deterministic_algorithms(True)` raises `RuntimeError` on an operation with no deterministic version, and deterministic operations are often slower; `torch.backends.cudnn.benchmark = False` stops cuDNN choosing a different algorithm per run. https://docs.pytorch.org/docs/stable/generated/torch.use_deterministic_algorithms.html and https://docs.pytorch.org/docs/stable/notes/randomness.html
- `np.random.default_rng(seed)` returns a `Generator`; with no seed it draws from the operating system. The module-level functions are the legacy global `RandomState`. https://numpy.org/doc/stable/reference/random/index.html
- A `random` seed reproduces a sequence run to run on one thread; most algorithms may change across Python versions. https://docs.python.org/3/library/random.html
- scikit-learn's `random_state` defaults to `None`, which gives different results on each call; an integer gives the same result every call. https://scikit-learn.org/stable/common_pitfalls.html

## Arrays and dataframes

- Vectorized NumPy code has no explicit loop: the loop runs in compiled C, and broadcasting applies it across shapes without copying. https://numpy.org/doc/stable/user/whatisnumpy.html and https://numpy.org/doc/stable/user/basics.broadcasting.html
- Iterating over pandas objects is slow, and `apply()` with a Python callable is a Python-level loop; use the vectorized method where one exists. https://pandas.pydata.org/docs/user_guide/basics.html
- Remove loops and vectorize first; Cython, Numba and `pandas.eval()` come after. https://pandas.pydata.org/docs/user_guide/enhancingperf.html
- To fit data in memory, read only the columns needed (`columns=`, `usecols=`), store repeated text as `category`, downcast numbers, and process in chunks; pandas points to other libraries beyond that. https://pandas.pydata.org/docs/user_guide/scale.html
- Copy-on-Write is the only mode in pandas 3: chained assignment never works; assign with `.loc`. https://pandas.pydata.org/docs/user_guide/migration.html and https://pandas.pydata.org/docs/user_guide/indexing.html
- A pandas column can be Arrow-backed, `dtype="int64[pyarrow]"`, with missing-value support for every type. https://pandas.pydata.org/docs/user_guide/pyarrow.html
- Polars prefers the lazy API: `scan_*` then `collect()` lets the optimizer push filters and column selection down into the read. https://docs.pola.rs/user-guide/concepts/lazy-api/
- `collect(engine="streaming")` runs a lazy query in batches, for data larger than memory. https://docs.pola.rs/user-guide/concepts/streaming/
- Polars `map_elements()` calls a Python function per value and is slow; use an expression. https://docs.pola.rs/user-guide/expressions/user-defined-python-functions/
- Polars has no index and uses `null` for missing data in every dtype; pandas casts an integer column with missing values to float `NaN`. https://docs.pola.rs/user-guide/migration/pandas/
- Parquet is columnar; `scan_parquet()` reads it lazily. https://docs.pola.rs/user-guide/io/parquet/
- Arrow is a columnar memory layout read zero-copy, and can be memory-mapped from disk. https://huggingface.co/docs/datasets/about_arrow

## scikit-learn

- Data leakage, using information not available at prediction time, gives overly optimistic scores. Split first; never call `fit` or `fit_transform` on test data; `transform` both subsets. https://scikit-learn.org/stable/common_pitfalls.html
- A `Pipeline` fits each step on the training subset only, in cross-validation and hyperparameter search too. https://scikit-learn.org/stable/common_pitfalls.html and https://scikit-learn.org/stable/modules/compose.html
- Tuning on the test set leaks it into the model; hold out a validation set or cross-validate, and keep the test set for the final evaluation. https://scikit-learn.org/stable/modules/cross_validation.html

## Embeddings and vector search

- Cosine similarity is the dot product of L2-normalized vectors; on vectors already normalized the two are equal and the plain dot product is faster. https://scikit-learn.org/stable/modules/metrics.html
- `SentenceTransformer.encode()` batches 32 inputs by default; `normalize_embeddings=True` returns unit-length vectors. https://sbert.net/docs/package_reference/sentence_transformer/SentenceTransformer.html
- The similarity function (`cosine` by default, `dot`, `euclidean`, `manhattan`) is saved with the model. https://sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html
- Query and corpus are embedded into the same vector space; a short query against longer passages uses `encode_query` and `encode_document`. https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html
- Exact search suits a corpus up to about 1 million entries; beyond that an approximate nearest neighbor index trades recall for speed. https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html

## Export and serving

- `torch.onnx.export(..., dynamo=True)`, the default, exports through `torch.export`; variable input sizes are declared with `dynamic_shapes`. https://docs.pytorch.org/docs/stable/onnx.html
- `optimum-cli export onnx --model <id> <dir>/` exports a transformers model and validates each output against the source model within a tolerance (`--atol`). https://huggingface.co/docs/transformers/serialization and https://huggingface.co/docs/optimum-onnx/onnx/usage_guides/export_a_model
- `onnxruntime` (CPU) and `onnxruntime-gpu` are separate packages; install one per environment. https://onnxruntime.ai/docs/get-started/with-python.html
- `InferenceSession(path, providers=[...])` picks each operator's kernel from the providers in list order, so the list is the fallback order. https://onnxruntime.ai/docs/api/python/api_summary.html and https://onnxruntime.ai/docs/execution-providers/

## Notebooks

- A module is a file of definitions that a script or an interactive session imports. https://docs.python.org/3/tutorial/modules.html
- A notebook is a JSON file; each code cell stores its source, its outputs and an execution count. https://nbformat.readthedocs.io/en/latest/format_description.html
- `%autoreload 2` reloads edited modules before each cell runs. https://ipython.readthedocs.io/en/stable/config/extensions/autoreload.html
