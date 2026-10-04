# WISP CSI receiver firmware (single-board router mode) for ESP32-S3.
# Based on Espressif esp-csi examples/get-started/csi_recv_router (Apache-2.0 / CC0).
cmake_minimum_required(VERSION 3.16)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(wisp_csi_router)
