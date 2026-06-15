import os
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

STM_DB_URI = os.getenv("STM_DB_URI")

# Create a stable, reusable connection pool for the Postgres saver
pool = AsyncConnectionPool(
    conninfo=STM_DB_URI,
    open=False,
    min_size=1,
    max_size=20,
    kwargs={"autocommit": True, "row_factory": dict_row}
)

_checkpointer = None

def get_checkpointer() -> AsyncPostgresSaver:
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = AsyncPostgresSaver(pool)
    return _checkpointer