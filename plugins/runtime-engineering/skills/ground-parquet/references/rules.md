# Rules: what the pages say about Parquet

One fact per line, then the page that states it. Library defaults were read at the versions the pages showed: the `parquet` and `arrow` crates 60.1.0, PyArrow 26.0.1, DuckDB 2.0. A default moves between releases; re-read the page before relying on one. The choices built on these facts are in [start](start.md).

## The file

- Parquet is an open source, column-oriented data file format designed for efficient data storage and retrieval. https://parquet.apache.org/docs/overview/
- A file is one or more row groups; a row group holds exactly one column chunk per column; a column chunk holds one or more pages. https://parquet.apache.org/docs/concepts/
- A row group is a logical horizontal partition of rows with no guaranteed physical structure; a column chunk is contiguous in the file; a page is the indivisible unit of encoding and compression. https://parquet.apache.org/docs/concepts/
- An unencrypted file starts and ends with the 4-byte magic number `PAR1`; the file metadata, then its 4-byte length, sit just before the closing magic number. A file encrypted with a plaintext footer also uses `PAR1`, but a 28-byte footer signature follows the metadata, and the 4-byte length counts both. A file with an encrypted footer starts and ends with `PARE` instead. https://parquet.apache.org/docs/file-format/ and https://github.com/apache/parquet-format/blob/master/Encryption.md
- File metadata is written after the data so a writer needs one pass; a reader reads the metadata first to find the column chunks it wants. https://parquet.apache.org/docs/file-format/
- The file metadata holds the location of every column chunk; page headers are stored in line with the page data; both are Thrift structures in the compact protocol. https://parquet.apache.org/docs/file-format/metadata/
- If an error happens while the file metadata is being written, all the data written is unreadable. https://parquet.apache.org/docs/file-format/data-pages/errorrecovery/
- Not all implementations support the same features of the format; test compatibility across the implementations a workflow joins. https://parquet.apache.org/docs/overview/
- The format extends through the file version, encodings added by enum, and page types a reader can skip. https://parquet.apache.org/docs/file-format/extensibility/

## Types

- The physical types are BOOLEAN, INT32, INT64, INT96 (deprecated), FLOAT, DOUBLE, BYTE_ARRAY and FIXED_LEN_BYTE_ARRAY; the set is kept minimal, and logical types annotate them. https://parquet.apache.org/docs/file-format/types/
- Logical type annotations are stored as `LogicalType` fields in the file metadata. https://github.com/apache/parquet-format/blob/master/README.md
- `STRING` annotates BYTE_ARRAY as UTF-8; its sort order is unsigned byte-wise comparison. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- `DATE` annotates an INT32 that counts days from the Unix epoch. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- `DECIMAL` stores an unscaled integer with a required precision and a scale that defaults to 0: INT32 for precision 1 to 9, INT64 for 1 to 18, a fixed-length array limited by its size, or a byte array with no limit. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- `TIMESTAMP` has two parameters: `isAdjustedToUTC` (true or false) and `unit` (`MILLIS`, `MICROS` or `NANOS`). There is no seconds unit. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- `isAdjustedToUTC=true` is an instant: a count of units since 1970-01-01 00:00:00 UTC. The original time zone is lost in writing it. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- `isAdjustedToUTC=false` is a local date and time that identifies no instant without a zone supplied from elsewhere. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- An INT64 timestamp in `NANOS` covers only 1677-09-21 to 2262-04-11. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- A reader that meets an unknown timestamp unit must treat it as an unsupported feature, not as bad data. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- INT96 is deprecated and used only by legacy implementations, yet it was still common in newly produced files as of 2024. https://parquet.apache.org/docs/file-format/types/ and https://parquet.apache.org/docs/file-format/implementationstatus/
- `LIST` annotates a three-level structure: an optional or required group, a repeated group named `list`, and a field named `element`. New writers always produce this form; readers carry rules for older forms. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- `MAP` annotates a three-level structure whose repeated group `key_value` holds a required `key` and an optional `value`. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- `GEOMETRY` and `GEOGRAPHY` annotate a BYTE_ARRAY of well-known binary (WKB); the coordinate reference system defaults to `OGC:CRS84`, longitude then latitude. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md

## Nulls and nesting

- Nulls are not stored in the data; they are encoded in the definition levels, which are run-length encoded. https://parquet.apache.org/docs/file-format/nulls/
- A required, non-nested column stores only its encoded values: no definition or repetition levels. https://parquet.apache.org/docs/file-format/data-pages/
- Nested columns use the Dremel encoding: definition levels count the optional fields defined along the path, repetition levels mark the repeated field at which a value repeats. https://parquet.apache.org/docs/file-format/nestedencoding/

## Encodings

- Dictionary encoding stores each distinct value once in a dictionary page per column chunk and stores the data as integer indexes in the run-length and bit-packing hybrid. https://github.com/apache/parquet-format/blob/master/Encodings.md
- When a dictionary grows too big, in size or in distinct values, the writer falls back to plain encoding. https://github.com/apache/parquet-format/blob/master/Encodings.md
- A column chunk has at most one dictionary page, placed first, and may be only partly dictionary encoded. https://github.com/apache/parquet-format/blob/master/README.md
- `PLAIN_DICTIONARY` is deprecated; new files use `RLE_DICTIONARY` in data pages and `PLAIN` in the dictionary page. https://github.com/apache/parquet-format/blob/master/Encodings.md
- The run-length and bit-packing hybrid encodes booleans, dictionary indexes and levels; `BIT_PACKED` is deprecated. https://github.com/apache/parquet-format/blob/master/Encodings.md and https://parquet.apache.org/docs/file-format/nestedencoding/
- `DELTA_BINARY_PACKED` encodes INT32 and INT64 and keeps a bit width per miniblock, so it tolerates values of varying size. https://github.com/apache/parquet-format/blob/master/Encodings.md
- `BYTE_STREAM_SPLIT` does not shrink data; it makes floats, integers and fixed-length arrays compress better afterwards. https://github.com/apache/parquet-format/blob/master/Encodings.md
- Dictionary encoding is on by default in the Rust crate and in PyArrow, each with a 1 MiB dictionary page limit. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html

## Compression

- Compression applies to the data inside dictionary and data pages, and is chosen per column. https://parquet.apache.org/docs/file-format/data-pages/compression/ and https://parquet.apache.org/docs/overview/motivation/
- The codecs are UNCOMPRESSED, SNAPPY, GZIP, LZO, BROTLI, LZ4 (deprecated), ZSTD and LZ4_RAW. https://parquet.apache.org/docs/file-format/data-pages/compression/
- The `LZ4` codec is deprecated for its undocumented framing; writers are told to move users to `LZ4_RAW`. https://parquet.apache.org/docs/file-format/data-pages/compression/
- The default codec differs by writer: uncompressed in the Rust crate, Snappy in PyArrow, pandas, DuckDB and GDAL, zstd in Polars, zstd level 3 in DataFusion. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html and https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_parquet.html and https://duckdb.org/docs/stable/data/parquet/overview and https://gdal.org/en/stable/drivers/vector/parquet.html and https://docs.pola.rs/api/python/stable/reference/api/polars.DataFrame.write_parquet.html and https://datafusion.apache.org/user-guide/configs.html
- The Rust crate defaults to no block compression because decode throughput can matter more than size on cheap object storage; where compression is wanted it names ZSTD as a good balance of compression, performance and ecosystem support, and LZ4_RAW as faster to decompress but less widely supported. https://docs.rs/parquet/latest/parquet/basic/enum.Compression.html
- Polars: zstd for good compression performance, lz4 for fast compression and decompression, Snappy for compatibility with older readers. https://docs.pola.rs/api/python/stable/reference/api/polars.DataFrame.write_parquet.html
- PyArrow: Snappy generally performs better, Gzip may yield smaller files. https://arrow.apache.org/docs/python/parquet/parquet.html
- DuckDB: gzip is heavyweight and costs decompression time on every read; Snappy, LZ4 and zstd are lightweight and faster to decompress. https://duckdb.org/docs/stable/guides/performance/file_formats
- A high zstd level trades a longer write for a smaller file, which suits data written once and read many times. https://duckdb.org/docs/stable/guides/performance/file_formats

## Statistics, the page index and Bloom filters

- Min and max statistics are stored at the column chunk, the column index and the data page, each by the sort order the footer defines for the column. https://github.com/apache/parquet-format/blob/master/README.md
- A stored min or max may be a shortened bound, not an actual value; `is_max_value_exact` says which. A missing `null_count` must not be read as zero. https://github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift
- When `nan_count` is absent a reader must assume NaN values may be present. https://github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift
- The Rust crate truncates statistics and column index bounds to 64 bytes by default. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html
- Geometry and geography columns carry no min and max; a reader must ignore any it finds. https://github.com/apache/parquet-format/blob/master/LogicalTypes.md
- The page index is optional metadata per column chunk: a column index of per-page min and max, and an offset index of page locations, stored near the footer so a scan that does not need them pays nothing. https://github.com/apache/parquet-format/blob/master/PageIndex.md
- The page index is not a secondary index: it does not sort key values over unsorted data. https://github.com/apache/parquet-format/blob/master/PageIndex.md
- A Bloom filter answers "definitely no" or "probably yes", with no false negatives, and gives pushdown on high-cardinality columns where a dictionary would be too large. https://github.com/apache/parquet-format/blob/master/BloomFilter.md
- Bloom filters are off by default in the Rust crate, PyArrow and DataFusion. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html and https://datafusion.apache.org/user-guide/configs.html
- PyArrow does not write the page index by default and does not yet use it when reading. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html and https://arrow.apache.org/docs/python/parquet/parquet.html
- The Rust crate writes page-level statistics and the offset index by default; a reader sets its page index policy through `ArrowReaderOptions`. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html and https://docs.rs/parquet/latest/parquet/arrow/arrow_reader/struct.ArrowReaderOptions.html
- DuckDB reads and writes the page index as of version 2.0. https://duckdb.org/docs/stable/data/parquet/overview
- Which implementation prunes by statistics, page index or Bloom filter is tabulated per implementation. https://parquet.apache.org/docs/file-format/implementationstatus/

## Reading less: projection and predicate pushdown

- DuckDB reads only the columns a query needs, and pushes filters into the scan to skip row groups whose min and max cannot match. https://duckdb.org/docs/stable/data/parquet/overview
- Sorting rows on the most-filtered column before writing makes row group ranges tight and non-overlapping, so selective queries scan far fewer row groups. https://duckdb.org/docs/stable/data/parquet/tips
- PyArrow: `columns=` reads only those columns; `filters=` skips whole row groups by their statistics and whole files by their partition keys. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html and https://arrow.apache.org/docs/python/parquet/parquet.html
- pandas `read_parquet` takes `columns` and `filters`; the filters are implemented by the pyarrow engine. https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html
- Polars `scan_parquet` returns a lazy frame; the optimizer pushes predicates and projections down to the scan. https://docs.pola.rs/user-guide/io/parquet/ and https://docs.pola.rs/user-guide/lazy/optimizations/
- Rust: `with_projection` limits columns, `with_row_groups` limits row groups, `with_row_filter` skips decoding rows, and the page index makes the row filter and limit cheaper. https://docs.rs/parquet/latest/parquet/arrow/arrow_reader/struct.ArrowReaderBuilder.html
- DataFusion prunes row groups and uses the page index by default; applying filters during decoding (`pushdown_filters`) is off by default. https://datafusion.apache.org/user-guide/configs.html

## Row groups, pages and file size

- The format's own page recommends row groups of 512 MB to 1 GB, sized to one HDFS block, and 8 KB pages. https://parquet.apache.org/docs/file-format/configurations/
- DuckDB works best with row groups of 100,000 to 1,000,000 rows, because it parallelizes over row groups; one giant row group is read by one thread. https://duckdb.org/docs/stable/guides/performance/file_formats
- In DuckDB's measurement, 2,048-row groups ran about 3.7 times slower than well-sized ones, and above 60,000 rows the differences were small. https://duckdb.org/docs/stable/guides/performance/file_formats
- A larger row group gives compression more to work with and costs the writer more memory; more row groups than threads speed selective queries and slow full scans. https://duckdb.org/docs/stable/data/parquet/tips
- Row group defaults: 122,880 rows in DuckDB, up to 1,048,576 rows in PyArrow and DataFusion, 262,144 (512 squared) in Polars, 65,536 in GDAL. https://duckdb.org/docs/stable/data/parquet/tips and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html and https://datafusion.apache.org/user-guide/configs.html and https://docs.pola.rs/api/python/stable/reference/api/polars.DataFrame.write_parquet.html and https://gdal.org/en/stable/drivers/vector/parquet.html
- The Rust crate limits a row group by rows, by bytes, or both, the smaller winning. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html
- The data page limit defaults to 1 MiB and 20,000 rows in the Rust crate and in PyArrow. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- DuckDB's ideal is 100 MB to 10 GB per file, with at least as many row groups across all files as CPU threads. https://duckdb.org/docs/stable/guides/performance/file_formats
- BigQuery: aim for row groups of at least 16 MiB, keep rows to 50 MB or less, and shrink the page size below 1 MiB when a file has more than 100 columns. https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- A file is more resilient to corruption with smaller row groups. https://parquet.apache.org/docs/file-format/data-pages/errorrecovery/

## Partitioning and many files

- Hive partitioning splits a table into folders named `key=value`; the partition value lives in the folder name. https://duckdb.org/docs/stable/data/partitioning/hive_partitioning
- A filter on a partition key skips the folders and files that cannot match. https://duckdb.org/docs/stable/data/partitioning/hive_partitioning and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html
- Writing many small partitions is expensive; DuckDB recommends at least 100 MB of data per partition. https://duckdb.org/docs/stable/data/partitioning/partitioned_writes
- DuckDB names partition files `data_0.parquet` and so on; `FILENAME_PATTERN` with `{uuid}` or `{i}` sets the name, and a partitioned write does not overwrite an existing directory unless told to. https://duckdb.org/docs/stable/data/partitioning/partitioned_writes
- Reading a set of files as one table works when they share a schema; DuckDB takes the schema of the first file, drops columns missing from it and errors on columns missing later, unless `union_by_name` is set. https://duckdb.org/docs/stable/data/multiple_files/combining_schemas
- PyArrow infers a dataset's schema from the first file by default. https://arrow.apache.org/docs/python/dataset.html
- Polars `scan_parquet` raises on a missing or an extra column by default. https://docs.pola.rs/api/python/stable/reference/api/polars.scan_parquet.html
- Polars turns hive parsing on when given a single directory, and writes hive directories with `partition_by`. https://docs.pola.rs/user-guide/io/hive/
- Small data files cost metadata and file-open time; table formats ship compaction to merge them. https://iceberg.apache.org/docs/latest/maintenance/ and https://docs.delta.io/latest/optimizations-oss.html

## Schema change and immutability

- The format keeps metadata apart from data so that one metadata file can reference several Parquet files. https://parquet.apache.org/docs/file-format/
- Files in one set can differ in schema; DuckDB's `union_by_name` unifies them by column name and fills nulls for a column a file lacks. https://duckdb.org/docs/stable/data/parquet/tips
- DuckDB's `schema` option maps columns by field id or by name to rename, add, drop, reorder or cast on read. https://duckdb.org/docs/stable/data/parquet/overview
- The Iceberg specification names Parquet an immutable file format: files are not moved or altered once written. https://iceberg.apache.org/spec/
- Hive-style tables cannot change their partition layout without a new table, and renaming a column can be unsupported or cause correctness problems. https://iceberg.apache.org/docs/latest/evolution/
- A Cloud Storage object is immutable: it cannot change during its storage lifetime, and no incremental change can be made to it. https://cloud.google.com/storage/docs/objects

## Table formats on top

- Iceberg is a table format for huge analytic tables that lets several engines work on the same tables safely at the same time. https://iceberg.apache.org/
- Iceberg tracks individual data files, not directories; a commit swaps the table metadata file atomically, which gives serializable isolation and snapshot reads without listing. https://iceberg.apache.org/spec/ and https://iceberg.apache.org/docs/latest/reliability/
- Iceberg adds, drops, renames, widens and reorders columns as metadata changes with no file rewrite, tracking each column by a unique id. https://iceberg.apache.org/docs/latest/evolution/
- Iceberg partitioning is hidden: readers need not know the layout, and the layout can change. https://iceberg.apache.org/docs/latest/partitioning/
- Iceberg version 2 deletes or replaces rows in immutable files through delete files, without rewriting the data file. https://iceberg.apache.org/spec/
- Iceberg snapshots accumulate until expired; small files are merged by a rewrite action. https://iceberg.apache.org/docs/latest/maintenance/
- Delta Lake provides ACID transactions, schema enforcement, time travel, and merge, update and delete over data lakes. https://docs.delta.io/latest/index.html
- A Delta writer writes new data files, then commits by adding a log entry that records the files added and removed; readers pick one consistent snapshot from the log. https://github.com/delta-io/delta/blob/master/PROTOCOL.md
- In Delta, partition values for a file must be read from the transaction log; the `key=value` directory names are convention only. https://github.com/delta-io/delta/blob/master/PROTOCOL.md
- Delta uses optimistic concurrency control; updates, deletes and merges can conflict with one another. https://docs.delta.io/latest/concurrency-control.html
- DuckDB reads Iceberg tables directly and writes them through a REST catalog; its Delta extension reads tables, creates them and appends. https://duckdb.org/docs/stable/core_extensions/iceberg/overview and https://duckdb.org/docs/stable/core_extensions/delta
- A table kept as directories of files, found by listing, cannot change atomically, and listing can return incorrect results on an eventually consistent store; that is the gap a table format closes. https://iceberg.apache.org/docs/latest/reliability/

## Rust

- The `parquet` crate is the official native Rust implementation, part of the Arrow project. https://docs.rs/parquet/latest/parquet/
- Most users write with `ArrowWriter` and read with `ParquetRecordBatchReaderBuilder`; the async pair is `AsyncArrowWriter` and `ParquetRecordBatchStreamBuilder`, which optimizes IO from the predicates and projections given. https://docs.rs/parquet/latest/parquet/
- Object storage is reached by implementing `AsyncFileReader` over a client such as the `object_store` crate. https://docs.rs/parquet/latest/parquet/
- The writer stores the Arrow schema under a metadata key so types read back exactly; where it disagrees with the Parquet schema, the Parquet schema wins without an error. https://docs.rs/parquet/latest/parquet/arrow/index.html
- The writer version defaults to `PARQUET_1_0`; the value can decide what features some readers support. https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html
- Encryption is behind the experimental `encryption` feature. https://docs.rs/parquet/latest/parquet/arrow/index.html
- The `arrow` crate is a complete, safe, native Rust implementation of Arrow; only little-endian platforms are officially supported. https://docs.rs/arrow/latest/arrow/
- DataFusion is an extensible query engine written in Rust with built-in Parquet support; `CREATE EXTERNAL TABLE ... STORED AS PARQUET` registers a location, with `PARTITIONED BY` for its partition columns. https://datafusion.apache.org/ and https://datafusion.apache.org/user-guide/sql/ddl.html
- DataFusion writes zstd level 3, row groups of up to 1,048,576 rows, page-level statistics and writer version 1.0 by default. https://datafusion.apache.org/user-guide/configs.html
- Polars reads and writes Parquet in Rust behind its `parquet` feature. https://docs.rs/polars/latest/polars/ and https://docs.pola.rs/user-guide/io/parquet/

## Python

- PyArrow `write_table` defaults: Snappy, dictionary on, statistics on, format version 2.6, data page version 1.0, the Arrow schema stored in the file. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- Files written at version 2.4 or 2.6 may not be readable by every implementation. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- At version 2.6 PyArrow writes nanosecond timestamps as they are; at 1.0 and 2.4 it casts them to microseconds; seconds are always cast to milliseconds. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- A cast that loses timestamp precision raises unless `allow_truncated_timestamps=True`, which takes effect only when `coerce_timestamps` is set. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- Parquet stores only the UTC values; PyArrow restores a column's time zone from the Arrow schema it stored in the file. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- PyArrow writes INT96 only when asked, and reads INT96 as nanosecond timestamps unless `coerce_int96_timestamp_unit` is set. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html
- `ParquetWriter` writes a file of several row groups; `iter_batches` reads a large file in bounded memory. https://arrow.apache.org/docs/python/parquet/parquet.html
- BYTE_ARRAY and LIST columns read as 32-bit-offset Arrow types, which can overflow on very large data; `binary_type` and `list_type` choose larger ones. https://arrow.apache.org/docs/python/parquet/parquet_type_handling.html
- PyArrow reads JSON, UUID, geometry and geography logical types as Arrow extension types by default. https://arrow.apache.org/docs/python/parquet/parquet_type_handling.html
- pandas reads and writes through an engine: pyarrow first, fastparquet if pyarrow is absent. `to_parquet` defaults to Snappy and writes the index. https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_parquet.html
- Polars `write_parquet` defaults to zstd and 262,144-row groups, and writes min, max and null count. https://docs.pola.rs/api/python/stable/reference/api/polars.DataFrame.write_parquet.html
- DuckDB queries a Parquet file by path, a glob, a list or a directory, with no load step. https://duckdb.org/docs/stable/data/parquet/overview

## TypeScript, Node and the browser

- DuckDB's Node client is `@duckdb/node-api`, over bindings to DuckDB's C API; Arrow APIs are on its roadmap, not done. https://duckdb.org/docs/stable/clients/node_neo/overview
- DuckDB-Wasm is DuckDB compiled to WebAssembly and published as `@duckdb/duckdb-wasm`; it runs in the browser with no server. https://duckdb.org/docs/stable/clients/wasm/overview
- In DuckDB-Wasm a Parquet file is registered (a file handle, a URL or a buffer), then read with SQL; a remote read is a browser request, subject to CORS. https://duckdb.org/docs/stable/clients/wasm/data_ingestion
- DuckDB-Wasm keeps no extension installs between sessions; `LOAD` fetches the extension each time. https://duckdb.org/docs/stable/clients/wasm/extensions
- hyparquet is pure JavaScript with no dependencies, for browsers and Node, and reads over HTTP range requests; it decompresses only Snappy unless `hyparquet-compressors` is added. https://github.com/hyparam/hyparquet/blob/master/README.md
- hyparquet-writer defaults to Snappy and to a first row group of 1,000 rows then 100,000. https://github.com/hyparam/hyparquet-writer/blob/master/README.md
- parquet-wasm binds the Rust `parquet` and `arrow` crates to WebAssembly and pairs with a JavaScript Arrow library; its bundle is 1.2 MB brotli-compressed with every codec, and its objects hold WebAssembly memory until freed. https://github.com/kylebarron/parquet-wasm/blob/main/README.md
- parquet-wasm's sync API needs the whole file in memory first; its async API reads parts of a remote file. https://github.com/kylebarron/parquet-wasm/blob/main/README.md
- `@dsnp/parquetjs` is a pure JavaScript fork that buffers one row group in memory while writing and lists PLAIN and RLE as its encodings. https://github.com/LibertyDSNP/parquetjs/blob/main/README.md
- Of the JavaScript libraries, only hyparquet is in the format's implementation table, where it lacks modular encryption and page checksums. https://parquet.apache.org/docs/file-format/implementationstatus/

## Spatial data: GeoParquet

- GeoParquet is an incubating Open Geospatial Consortium standard; its latest release is 2.0.0, with 1.1.0 and 1.0.0 before it. https://geoparquet.org/ and https://geoparquet.org/releases/
- GeoParquet 1.1 encodes a geometry column as WKB in a BYTE_ARRAY, or as one of six native single-geometry encodings based on GeoArrow; WKB is the preferred option for portability. https://geoparquet.org/releases/v1.1.0/
- GeoParquet 2.0 requires Parquet's own `GEOMETRY` or `GEOGRAPHY` logical type, and WKB is its only encoding. https://geoparquet.org/releases/v2.0.0/
- A GeoParquet 2.0 file carries a `geo` key in the file key-value metadata: JSON with `version`, `primary_column` and `columns`. https://geoparquet.org/releases/v2.0.0/
- Geometry columns sit at the root of the schema and are required or optional, never repeated or nested. https://geoparquet.org/releases/v2.0.0/
- The metadata `crs` is PROJJSON; an absent `crs` means `OGC:CRS84`, and an explicit `null` means unknown, which is a different statement. https://geoparquet.org/releases/v2.0.0/
- WKB coordinates are always x then y (easting or longitude, then northing or latitude), whatever the reference system's own axis order. https://geoparquet.org/releases/v2.0.0/
- A bbox covering names a root-level group of `xmin`, `ymin`, `xmax`, `ymax` floats per row, so readers can prune by row group and page statistics; it does not work for geometries that cross the antimeridian. https://geoparquet.org/releases/v2.0.0/
- With the native types, every row group already has a bounding box in its statistics, so most 2.0 files need no bbox column. https://github.com/opengeospatial/geoparquet/blob/main/format-specs/distributing-geoparquet.md
- The file extension is `.parquet`; `.geoparquet` should not be used. https://geoparquet.org/releases/v2.0.0/
- For distribution: zstd at level 15 or higher, row groups of 50,000 to 150,000 rows, spatial ordering, and spatial partitioning above about 2 GB. https://github.com/opengeospatial/geoparquet/blob/main/format-specs/distributing-geoparquet.md
- GDAL reads and writes Parquet since 3.5, GeoParquet 1.0 since 3.8 and 1.1 since 3.9; it writes WKB, Snappy and 65,536-row groups by default, and Parquet's native geometry types only on request, with GDAL 3.12 and libarrow 21. https://gdal.org/en/stable/drivers/vector/parquet.html
- GDAL's `SORT_BY_BBOX` and `WRITE_COVERING_BBOX` options order features spatially and write the bbox columns. https://gdal.org/en/stable/drivers/vector/parquet.html
- DuckDB's `GEOMETRY` is a built-in type since 1.5, keeps a bounding box per row group, and can carry a reference system; exporting it to GeoParquet needs the full CRS definition. https://duckdb.org/docs/stable/sql/data_types/geometry

## PostgreSQL and PostGIS

- PostgreSQL `COPY` reads and writes text, CSV and its own binary format; Parquet is not among them. https://www.postgresql.org/docs/current/sql-copy.html
- DuckDB's `postgres` extension attaches a running PostgreSQL database; `COPY postgres_db.tbl TO 'data.parquet'` exports a table and `COPY postgres_db.tbl FROM 'data.parquet'` loads one. https://duckdb.org/docs/stable/core_extensions/postgres
- `ogr2ogr` converts simple features between formats; GDAL has a PostgreSQL/PostGIS driver and a Parquet driver. https://gdal.org/en/stable/programs/ogr2ogr.html and https://gdal.org/en/stable/drivers/vector/pg.html and https://gdal.org/en/stable/drivers/vector/parquet.html
- DuckDB's spatial extension bundles its own GDAL, which may be older and support fewer formats than a system install. https://duckdb.org/docs/stable/core_extensions/spatial/gdal

## BigQuery and Cloud Storage

- A BigQuery load takes its schema from the Parquet files; a wildcard load fails if the files differ in schema, and a different column position is a different schema. https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- BigQuery reads Parquet compressed with GZip, LZO_1C, LZO_1X, LZ4_RAW, Snappy and ZSTD. https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- BigQuery's type table maps TIMESTAMP in millis and micros, and INT96, to `TIMESTAMP`; nanosecond timestamps are not in the table, and combinations not listed are unsupported. https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- Decimals load as NUMERIC, BIGNUMERIC or STRING by precision and scale; LIST columns need list inference turned on to load as plain repeated fields. https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- BigQuery loads the columns GeoParquet metadata describes as `GEOGRAPHY` by default. https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet and https://cloud.google.com/bigquery/docs/geospatial-data
- An external table over GeoParquet does not use the bbox or covering statistics to speed queries. https://cloud.google.com/bigquery/docs/geospatial-data
- External tables are read-only for BigQuery, carry no consistency guarantee if the files change during a query, and may be slower than loaded tables. https://cloud.google.com/bigquery/docs/external-tables
- BigQuery accepts only the default hive layout: `key=value` directories, the same keys in the same order under one common prefix, at most ten keys, and no key that is also a column in the files. https://cloud.google.com/bigquery/docs/hive-partitioned-loads-gcs and https://cloud.google.com/bigquery/docs/hive-partitioned-queries
- BigQuery exports to Parquet with SNAPPY, GZIP or ZSTD, up to 1 GB of table data per file, more through a wildcard. https://cloud.google.com/bigquery/docs/exporting-data
- Cloud Storage gives strong read-after-write consistency for objects and strongly consistent listing. https://cloud.google.com/storage/docs/consistency
- Compose concatenates the bytes of up to 32 objects into one object. https://cloud.google.com/storage/docs/composite-objects
- Sequential object names, such as a timestamp prefix, can slow Cloud Storage's auto-scaling; below about 1,000 writes or 5,000 reads per second no ramp-up is needed. https://cloud.google.com/storage/docs/request-rate
- DuckDB reads `gs://` paths through its `httpfs` extension with HMAC keys. https://duckdb.org/docs/stable/guides/network_cloud_storage/gcs_import

## Untrusted and damaged files

- A corrupt file metadata loses the file; corrupt column metadata loses that column chunk; a corrupt page header loses the rest of the chunk; a corrupt page loses the page. https://parquet.apache.org/docs/file-format/data-pages/errorrecovery/
- Any page can carry a CRC32 checksum of its bytes. https://parquet.apache.org/docs/file-format/data-pages/checksumming/
- PyArrow neither writes nor verifies page checksums by default: `write_page_checksum` and `page_checksum_verification` are both false. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html
- The sizes a reader uses to allocate compressed and decompressed buffers are written in the page header, so they come from the file. https://parquet.apache.org/docs/file-format/data-pages/compression/
- PyArrow caps the string and container sizes allocated while decoding the Thrift metadata, and the schema's nesting depth, each with an override. https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html
- Arrow's security model covers Arrow's own formats, describes a decompression bomb for its IPC format, and sends readers to the Parquet project's documentation for Parquet's risks. https://arrow.apache.org/docs/format/Security.html
- Arrow C++ assumes data is valid; `ValidateFull` checks offsets and values on untrusted data, and a custom `MemoryPool` can cap total allocation. https://arrow.apache.org/docs/cpp/security.html
- DuckDB: malicious input can consume excessive memory, disk, CPU or network; sandbox untrusted input, and treat an attacker-controlled path passed to `read_parquet` as able to read local files or remote URLs. https://duckdb.org/docs/stable/operations_manual/securing_duckdb/overview
- DuckDB rejects invalid UTF-8 in string columns by default (`utf8_validation = strict`). https://duckdb.org/docs/stable/data/parquet/overview

## Encryption

- Modular encryption encrypts and authenticates the columns and footer it is given keys for, and leaves the rest in plaintext, while keeping projection, pushdown, encoding and compression working. https://github.com/apache/parquet-format/blob/master/Encryption.md
- It is client-side: the storage server sees no keys and no plaintext of the encrypted parts. https://github.com/apache/parquet-format/blob/master/Encryption.md
- Each column and the footer can have its own key, or none; pages are compressed, then encrypted. https://github.com/apache/parquet-format/blob/master/Encryption.md
- With an encrypted footer the file ends in the magic string `PARE`, which tells a legacy reader at once that it cannot read the file; a plaintext footer is signed and lets legacy readers read the unencrypted columns. https://github.com/apache/parquet-format/blob/master/Encryption.md
- PyArrow uses envelope encryption: data keys encrypt file parts, master keys held in a key management service encrypt the data keys, and the caller supplies the client for that service. https://arrow.apache.org/docs/python/parquet/parquet_encryption.html
- DuckDB encrypts the footer and every column with one key held in session memory; per-column keys raise an error; it reads PyArrow files only when one key covers footer and columns. https://duckdb.org/docs/stable/data/parquet/encryption
- Support for modular encryption varies by implementation. https://parquet.apache.org/docs/file-format/implementationstatus/
