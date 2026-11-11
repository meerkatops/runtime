# Sources: the pages our Parquet claims rest on

Read each page live, one fetch per page. The specification files live in the `apache/parquet-format` repository; fetch the raw form, `https://raw.githubusercontent.com/apache/parquet-format/master/<file>`, to keep every link. `https://duckdb.org/docs/stable/...` forwards in the browser to the current version's page (`/docs/<version>/....html`); a plain fetch gets only the forwarding stub, so fetch the versioned page it names.

## What Parquet is and how a file is laid out

- https://parquet.apache.org/docs/overview/ — what Parquet is, the specification repository, the list of implementations.
- https://parquet.apache.org/docs/overview/motivation/ — why columnar, nested data, per-column compression.
- https://parquet.apache.org/docs/concepts/ — row group, column chunk, page.
- https://parquet.apache.org/docs/file-format/ — the byte layout, the `PAR1` magic number, the footer.
- https://parquet.apache.org/docs/file-format/metadata/ — file metadata and page headers.
- https://parquet.apache.org/docs/file-format/configurations/ — the format's own row group and page size advice.
- https://parquet.apache.org/docs/file-format/data-pages/ — what a data page holds.
- https://parquet.apache.org/docs/file-format/data-pages/checksumming/ and https://parquet.apache.org/docs/file-format/data-pages/errorrecovery/ — page checksums and what a corrupt part costs.
- https://parquet.apache.org/docs/file-format/extensibility/ — where the format can grow.
- https://parquet.apache.org/docs/file-format/implementationstatus/ — which implementation supports which feature.
- https://github.com/apache/parquet-format/blob/master/README.md — the specification's front page: sort order, column chunks, dictionary pages.
- https://github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift — the metadata structures; the comments on `Statistics` are the rules for min, max and null counts.

## Types, nulls and nesting

- https://parquet.apache.org/docs/file-format/types/ — the eight physical types.
- https://github.com/apache/parquet-format/blob/master/LogicalTypes.md — strings, integers, decimals, dates, times, timestamps, lists, maps, geometry.
- https://parquet.apache.org/docs/file-format/nulls/ and https://parquet.apache.org/docs/file-format/nestedencoding/ — definition and repetition levels.

## Encodings and compression

- https://github.com/apache/parquet-format/blob/master/Encodings.md — plain, dictionary, run-length, delta, byte stream split.
- https://parquet.apache.org/docs/file-format/data-pages/compression/ — the codecs and the deprecated one.
- https://docs.rs/parquet/latest/parquet/basic/enum.Compression.html — the Rust crate's view of the codec tradeoff.

## Skipping data: statistics, page index, Bloom filters

- https://github.com/apache/parquet-format/blob/master/PageIndex.md — the column index and offset index.
- https://github.com/apache/parquet-format/blob/master/BloomFilter.md — what a Bloom filter adds and costs.
- https://duckdb.org/docs/stable/data/parquet/overview — projection and filter pushdown, the page index, reader options.
- https://duckdb.org/docs/stable/data/parquet/tips — row group size, sorting before writing.

## Sizing, partitioning and many files

- https://duckdb.org/docs/stable/guides/performance/file_formats — row group and file size ranges, measured.
- https://duckdb.org/docs/stable/data/partitioning/hive_partitioning and https://duckdb.org/docs/stable/data/partitioning/partitioned_writes — hive directories, file names, partition cost.
- https://duckdb.org/docs/stable/data/multiple_files/overview and https://duckdb.org/docs/stable/data/multiple_files/combining_schemas — globs and files whose schemas differ.
- https://arrow.apache.org/docs/python/parquet/parquet_datasets.html and https://arrow.apache.org/docs/python/dataset.html — partitioned datasets and schema inference in PyArrow.
- https://docs.pola.rs/user-guide/io/hive/ — hive scans and writes in Polars.

## Rust

- https://docs.rs/parquet/latest/parquet/ — the official Rust implementation; sync and async readers and writers.
- https://docs.rs/parquet/latest/parquet/arrow/index.html — reading and writing Arrow record batches; the embedded Arrow schema.
- https://docs.rs/parquet/latest/parquet/file/properties/struct.WriterPropertiesBuilder.html — every writer default.
- https://docs.rs/parquet/latest/parquet/arrow/arrow_reader/struct.ArrowReaderBuilder.html and https://docs.rs/parquet/latest/parquet/arrow/arrow_reader/struct.ArrowReaderOptions.html — projection, row groups, row filters, the page index.
- https://docs.rs/arrow/latest/arrow/ — the Arrow crate.
- https://datafusion.apache.org/ and https://datafusion.apache.org/user-guide/configs.html — the query engine and its Parquet settings.
- https://datafusion.apache.org/user-guide/sql/ddl.html and https://datafusion.apache.org/user-guide/sql/format_options.html — external tables and write options.
- https://docs.rs/polars/latest/polars/ — Polars in Rust; Parquet is a feature.

## Python

- https://arrow.apache.org/docs/python/parquet/parquet.html — the PyArrow guide.
- https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html and https://arrow.apache.org/docs/python/generated/pyarrow.parquet.read_table.html — every option and default.
- https://arrow.apache.org/docs/python/parquet/parquet_type_handling.html — dictionary reads, large binary, extension types.
- https://docs.pola.rs/user-guide/io/parquet/ and https://docs.pola.rs/user-guide/lazy/optimizations/ — Polars reads, scans and pushdown.
- https://docs.pola.rs/api/python/stable/reference/api/polars.scan_parquet.html and https://docs.pola.rs/api/python/stable/reference/api/polars.DataFrame.write_parquet.html — options and defaults.
- https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_parquet.html and https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html — the pandas calls and their engine.

## TypeScript, Node and the browser

- https://duckdb.org/docs/stable/clients/node_neo/overview — the Node client, `@duckdb/node-api`.
- https://duckdb.org/docs/stable/clients/wasm/overview, https://duckdb.org/docs/stable/clients/wasm/data_ingestion and https://duckdb.org/docs/stable/clients/wasm/extensions — DuckDB in the browser.
- https://github.com/hyparam/hyparquet/blob/master/README.md and https://github.com/hyparam/hyparquet-writer/blob/master/README.md — a pure JavaScript reader and its writer.
- https://github.com/kylebarron/parquet-wasm/blob/main/README.md — the Rust crates compiled to WebAssembly.
- https://github.com/LibertyDSNP/parquetjs/blob/main/README.md — a pure JavaScript reader and writer.

## Spatial data

- https://geoparquet.org/ and https://geoparquet.org/releases/ — the standard and its releases.
- https://geoparquet.org/releases/v2.0.0/ and https://geoparquet.org/releases/v1.1.0/ — the two specifications in use.
- https://github.com/opengeospatial/geoparquet/blob/main/format-specs/geoparquet.md — the working copy of the specification.
- https://github.com/opengeospatial/geoparquet/blob/main/format-specs/distributing-geoparquet.md — compression, ordering, row group and partition advice.
- https://github.com/apache/parquet-format/blob/master/Geospatial.md — Parquet's own geometry types, coordinate reference systems and bounding box statistics.
- https://gdal.org/en/stable/drivers/vector/parquet.html — the GDAL driver and its creation options.
- https://duckdb.org/docs/stable/sql/data_types/geometry — DuckDB's geometry type and its statistics.

## Moving data in and out

- https://duckdb.org/docs/stable/core_extensions/postgres and https://duckdb.org/docs/stable/guides/database_integration/postgres — PostgreSQL to Parquet and back through DuckDB.
- https://gdal.org/en/stable/programs/ogr2ogr.html and https://gdal.org/en/stable/drivers/vector/pg.html — `ogr2ogr` and the PostgreSQL/PostGIS driver.
- https://duckdb.org/docs/stable/core_extensions/spatial/gdal — GDAL inside DuckDB.
- https://www.postgresql.org/docs/current/sql-copy.html — the formats `COPY` reads and writes.
- https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet — loading Parquet into BigQuery: limits, codecs, type conversions.
- https://cloud.google.com/bigquery/docs/external-tables and https://cloud.google.com/bigquery/docs/external-data-cloud-storage — querying Parquet in place.
- https://cloud.google.com/bigquery/docs/hive-partitioned-loads-gcs and https://cloud.google.com/bigquery/docs/hive-partitioned-queries — hive layouts BigQuery accepts.
- https://cloud.google.com/bigquery/docs/exporting-data — exporting a table to Parquet.
- https://cloud.google.com/bigquery/docs/geospatial-data — GeoParquet in BigQuery.
- https://cloud.google.com/storage/docs/objects, https://cloud.google.com/storage/docs/consistency, https://cloud.google.com/storage/docs/composite-objects and https://cloud.google.com/storage/docs/request-rate — objects, consistency, compose and naming at high request rates.
- https://duckdb.org/docs/stable/guides/network_cloud_storage/gcs_import and https://duckdb.org/docs/stable/core_extensions/httpfs/overview — DuckDB over Cloud Storage and HTTP.

## Table formats on top

- https://iceberg.apache.org/ and https://iceberg.apache.org/spec/ — what Iceberg is and how it tracks files.
- https://iceberg.apache.org/docs/latest/evolution/, https://iceberg.apache.org/docs/latest/partitioning/, https://iceberg.apache.org/docs/latest/reliability/ and https://iceberg.apache.org/docs/latest/maintenance/ — schema and partition evolution, atomic commits, compaction.
- https://docs.delta.io/latest/index.html — what Delta Lake offers.
- https://github.com/delta-io/delta/blob/master/PROTOCOL.md — the transaction log.
- https://docs.delta.io/latest/optimizations-oss.html, https://docs.delta.io/latest/delta-update.html and https://docs.delta.io/latest/concurrency-control.html — compaction, row changes, concurrent writers.
- https://duckdb.org/docs/stable/core_extensions/iceberg/overview and https://duckdb.org/docs/stable/core_extensions/delta — reading both from DuckDB.

## Security

- https://github.com/apache/parquet-format/blob/master/Encryption.md — modular encryption.
- https://arrow.apache.org/docs/python/parquet/parquet_encryption.html and https://duckdb.org/docs/stable/data/parquet/encryption — encryption in PyArrow and DuckDB.
- https://arrow.apache.org/docs/format/Security.html and https://arrow.apache.org/docs/cpp/security.html — Arrow's security model, validation and memory limits.
- https://duckdb.org/docs/stable/operations_manual/securing_duckdb/overview — untrusted input in DuckDB.

## Where Parquet does not fit

- https://www.postgresql.org/docs/current/tutorial-transactions.html, https://www.postgresql.org/docs/current/mvcc-intro.html and https://www.postgresql.org/docs/current/ddl-constraints.html — what a transactional database provides.
- https://duckdb.org/why_duckdb — the analytical workload, described by an engine built for it.
