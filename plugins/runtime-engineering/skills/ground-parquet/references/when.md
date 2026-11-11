# When Parquet fits, and when it does not

Parquet is a file format. It fits work that reads many rows of a few columns from data that is written once; it does not replace a database that changes rows inside transactions. Each line names the page that supports it.

## It fits

- Analytics: scans that project, filter and aggregate. The columnar layout and the statistics let an engine read only the columns and row groups a query needs. https://duckdb.org/docs/stable/guides/performance/file_formats and https://parquet.apache.org/docs/overview/
- Archive and backup: data written once and read many times, where a high zstd level trades a longer write for a smaller file and decompression time stays about constant. https://duckdb.org/docs/stable/guides/performance/file_formats and https://github.com/opengeospatial/geoparquet/blob/main/format-specs/distributing-geoparquet.md and https://cloud.google.com/bigquery/docs/exporting-data
- Export and interchange: the format is supported in many languages and tools, a file describes its own schema, and a warehouse loads it without a schema being supplied. https://parquet.apache.org/docs/overview/ and https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- Nested data: the format was built with complex nested structures in mind and stores them by the Dremel encoding rather than flattening them. https://parquet.apache.org/docs/overview/motivation/
- Data larger than memory: readers take one column, one row group or one batch at a time. https://arrow.apache.org/docs/python/parquet/parquet.html
- Query in place on object storage: engines read a path, a glob or a hive directory directly, over HTTP range requests where the client supports them. https://duckdb.org/docs/stable/data/parquet/overview and https://github.com/hyparam/hyparquet/blob/master/README.md
- Spatial interchange: GeoParquet gives geometry, its reference system and bounding boxes one agreed form across tools and warehouses. https://geoparquet.org/
- A snapshot of a database table for analysis: export from PostgreSQL through DuckDB or GDAL and query the files, leaving the database to its transactions. https://duckdb.org/docs/stable/core_extensions/postgres and https://gdal.org/en/stable/programs/ogr2ogr.html

## It does not fit

- A transactional system of record. A transaction bundles several steps into one all-or-nothing operation whose intermediate states no other transaction sees; a Parquet file offers no such operation, and a file is not even readable until its footer is written. https://www.postgresql.org/docs/current/tutorial-transactions.html and https://parquet.apache.org/docs/file-format/data-pages/errorrecovery/
- Updating or deleting single rows. Files are immutable once written; a change means a new file, or a table format's delete files and log. https://iceberg.apache.org/spec/ and https://cloud.google.com/storage/docs/objects
- Concurrent writers and readers on the same data. PostgreSQL gives each statement a consistent snapshot while others write; a directory of files cannot change atomically. https://www.postgresql.org/docs/current/mvcc-intro.html and https://iceberg.apache.org/docs/latest/reliability/
- Enforced integrity. Primary keys, unique constraints and foreign keys are database features; the format's page index is expressly not a secondary index. https://www.postgresql.org/docs/current/ddl-constraints.html and https://github.com/apache/parquet-format/blob/master/PageIndex.md
- Fetching one row by key, often. The unit of compression and decoding is the page, so a lookup decodes at least a page per column it returns, after reading the footer. https://parquet.apache.org/docs/concepts/ and https://github.com/apache/parquet-format/blob/master/PageIndex.md
- Small, frequent appends. Each append is a new file; many small files cost metadata and open time until something compacts them. https://iceberg.apache.org/docs/latest/maintenance/ and https://docs.delta.io/latest/optimizations-oss.html
- Join-heavy or repeated queries on one machine. DuckDB measured TPC-H 1.1 to 4.1 times slower on Parquet than on its own database file, which keeps better statistics; load the files first. https://duckdb.org/docs/stable/guides/performance/file_formats
- A schema that changes often. Over plain hive-style files a rename can be unsupported or cause correctness problems; Iceberg evolves a schema as a metadata change with no file rewrite. https://iceberg.apache.org/docs/latest/evolution/

## Between the two

- A table format over Parquet (Iceberg, Delta Lake) adds atomic commits, snapshots, row-level changes and schema evolution for analytic tables. Both describe themselves for analytic tables and data lakes. https://iceberg.apache.org/ and https://docs.delta.io/latest/index.html
- An analytical engine names its own target the same way: complex, long-running queries over large parts of the data, with large-scale changes. https://duckdb.org/why_duckdb
- The two work side by side: DuckDB's `postgres` extension exports a PostgreSQL table to Parquet and loads a file back into a table. https://duckdb.org/docs/stable/core_extensions/postgres
