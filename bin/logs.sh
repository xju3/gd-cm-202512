#!/bin/bash

# 接收参数
service=$1 || app
docker-compose -f ./docker-compose/docker-compose.yml logs -f $service
