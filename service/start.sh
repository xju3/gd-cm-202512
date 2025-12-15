#!/bin/bash

# 运行项目
uvicorn app.main:app --host 0.0.0.0 --port 7190 --reload
