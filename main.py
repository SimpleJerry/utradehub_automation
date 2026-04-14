from __future__ import annotations

from pathlib import Path

from app.config import load_config, setup_logger
from app.workflow import WorkflowRunner


def main() -> int:
    project_root = Path(__file__).resolve().parent
    config = load_config(project_root=project_root)
    logger = setup_logger(config)

    logger.info("Starting scaffold workflow")
    logger.info("Input directory: %s", config.input_pdf_dir)
    logger.info("Dry run: %s", config.dry_run)

    runner = WorkflowRunner(config=config, logger=logger)
    results = runner.run_batch()

    success_count = len([r for r in results if r.status == "success"])
    failed_count = len(results) - success_count
    logger.info("Done. success=%s failed=%s total=%s", success_count, failed_count, len(results))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
