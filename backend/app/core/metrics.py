"""System metrics for monitoring dashboard."""
import os, psutil
def get_system_metrics():
    return {
        "cpu_pct": psutil.cpu_percent(),
        "mem_pct": psutil.virtual_memory().percent,
        "disk_pct": psutil.disk_usage("/").percent,
    }
