/*
 * WISP CSI receiver — single-board "router mode" for ESP32-S3.
 *
 * The board joins your home Wi-Fi, pings the router ~100 times per second, and
 * prints the channel state information (CSI) of the router's replies as
 * CSI_DATA lines over the native USB port. WISP's sensing pipeline reads them.
 *
 * Wi-Fi credentials are NOT compiled in. They are sent once over USB from the
 * WISP Engineering view and stored in this board's NVS:
 *     WISP_WIFI <ssid as hex> <password as hex>
 * Other commands: WISP_STATUS, WISP_FORGET.
 *
 * Based on Espressif esp-csi examples/get-started/csi_recv_router
 * (Public Domain / CC0), including its AGC/FFT gain compensation.
 */
#include <stdio.h>
#include <stdarg.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"

#include "nvs_flash.h"
#include "nvs.h"
#include "esp_mac.h"
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_system.h"
#include "esp_idf_version.h"
#include "lwip/inet.h"
#include "ping/ping_sock.h"
#include "driver/usb_serial_jtag.h"
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 3, 0)
#include "driver/usb_serial_jtag_vfs.h"
#define WISP_VFS_USE_DRIVER() usb_serial_jtag_vfs_use_driver()
#else
#include "esp_vfs_usb_serial_jtag.h"
#define WISP_VFS_USE_DRIVER() esp_vfs_usb_serial_jtag_use_driver()
#endif

#include "esp_csi_gain_ctrl.h"

#define WISP_FW_VERSION   "wisp-csi-router 1.0"
#define SEND_FREQUENCY_HZ 100
#define NVS_NS            "wisp"
#define GOT_IP_BIT        BIT0

static EventGroupHandle_t s_events;
static wifi_ap_record_t s_ap_info;
static char s_ssid[33];
static char s_pass[65];
static volatile int s_disconnect_reason;

/* ------------------------------------------------------------------ output */

/* Non-blocking write: if the host isn't reading, lines are dropped rather than
 * stalling the Wi-Fi task. */
static void out(const char *s, size_t n)
{
    usb_serial_jtag_write_bytes(s, n, 0);
}

static void outf(const char *fmt, ...)
{
    char line[256];
    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(line, sizeof(line), fmt, ap);
    va_end(ap);
    if (n > 0) {
        out(line, n < (int)sizeof(line) ? (size_t)n : sizeof(line) - 1);
    }
}

/* ------------------------------------------------------------------ CSI */

static void wifi_csi_rx_cb(void *ctx, wifi_csi_info_t *info)
{
    if (!info || !info->buf || memcmp(info->mac, ctx, 6)) {
        return;
    }
    const wifi_pkt_rx_ctrl_t *rx = &info->rx_ctrl;
    static int s_count = 0;
    static char line[2600];
    float compensate_gain = 1.0f;
    uint8_t agc_gain = 0;
    int8_t fft_gain = 0;
    static uint8_t agc_base = 0;
    static int8_t fft_base = 0;

    esp_csi_gain_ctrl_get_rx_gain(rx, &agc_gain, &fft_gain);
    if (s_count < 100) {
        esp_csi_gain_ctrl_record_rx_gain(agc_gain, fft_gain);
    } else if (s_count == 100) {
        esp_csi_gain_ctrl_get_rx_gain_baseline(&agc_base, &fft_base);
    }
    esp_csi_gain_ctrl_get_gain_compensation(&compensate_gain, agc_gain, fft_gain);

    int n = snprintf(line, sizeof(line),
                     "CSI_DATA,%d," MACSTR ",%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,\"[%d",
                     s_count, MAC2STR(info->mac), rx->rssi, rx->rate, rx->sig_mode, rx->mcs, rx->cwb,
                     rx->smoothing, rx->not_sounding, rx->aggregation, rx->stbc, rx->fec_coding, rx->sgi,
                     rx->noise_floor, rx->ampdu_cnt, rx->channel, rx->secondary_channel, (int)rx->timestamp,
                     rx->ant, rx->sig_len, rx->sig_mode, info->len, info->first_word_invalid,
                     (int16_t)(compensate_gain * info->buf[0]));
    for (int i = 1; i < info->len && n < (int)sizeof(line) - 16; i++) {
        n += snprintf(line + n, sizeof(line) - n, ",%d", (int16_t)(compensate_gain * info->buf[i]));
    }
    n += snprintf(line + n, sizeof(line) - n, "]\"\n");
    out(line, n);
    s_count++;
}

static void wifi_csi_start(void)
{
    wifi_csi_config_t csi_config = {
        .lltf_en = true,
        .htltf_en = false,
        .stbc_htltf2_en = false,
        .ltf_merge_en = true,
        .channel_filter_en = true,
        .manu_scale = true,
        .shift = true,
    };
    ESP_ERROR_CHECK(esp_wifi_sta_get_ap_info(&s_ap_info));
    ESP_ERROR_CHECK(esp_wifi_set_csi_config(&csi_config));
    ESP_ERROR_CHECK(esp_wifi_set_csi_rx_cb(wifi_csi_rx_cb, s_ap_info.bssid));
    ESP_ERROR_CHECK(esp_wifi_set_csi(true));
}

static void ping_router_start(void)
{
    static esp_ping_handle_t ping = NULL;
    esp_ping_config_t cfg = ESP_PING_DEFAULT_CONFIG();
    cfg.count = 0; /* forever */
    cfg.interval_ms = 1000 / SEND_FREQUENCY_HZ;
    cfg.task_stack_size = 3072;
    cfg.data_size = 1;

    esp_netif_ip_info_t ip;
    esp_netif_get_ip_info(esp_netif_get_handle_from_ifkey("WIFI_STA_DEF"), &ip);
    cfg.target_addr.u_addr.ip4.addr = ip4_addr_get_u32(&ip.gw);
    cfg.target_addr.type = ESP_IPADDR_TYPE_V4;

    esp_ping_callbacks_t cbs = {0};
    esp_ping_new_session(&cfg, &cbs, &ping);
    esp_ping_start(ping);
    outf("WISP_READY fw=\"%s\" ssid=\"%s\" channel=%d ip=" IPSTR " gw=" IPSTR " rate_hz=%d\n",
         WISP_FW_VERSION, s_ssid, s_ap_info.primary, IP2STR(&ip.ip), IP2STR(&ip.gw), SEND_FREQUENCY_HZ);
}

/* ------------------------------------------------------------------ Wi-Fi */

static void on_event(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        wifi_event_sta_disconnected_t *d = (wifi_event_sta_disconnected_t *)data;
        s_disconnect_reason = d->reason;
        xEventGroupClearBits(s_events, GOT_IP_BIT);
        outf("WISP_WIFI_DISCONNECTED reason=%d\n", d->reason);
        esp_wifi_connect();
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        xEventGroupSetBits(s_events, GOT_IP_BIT);
    }
}

static void wifi_start(void)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t init = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, on_event, NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, on_event, NULL));

    wifi_config_t cfg = {0};
    strncpy((char *)cfg.sta.ssid, s_ssid, sizeof(cfg.sta.ssid));
    strncpy((char *)cfg.sta.password, s_pass, sizeof(cfg.sta.password));
    cfg.sta.threshold.authmode = s_pass[0] ? WIFI_AUTH_WPA_PSK : WIFI_AUTH_OPEN;
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &cfg));
    ESP_ERROR_CHECK(esp_wifi_start());
    esp_wifi_set_ps(WIFI_PS_NONE); /* power save would throttle the 100 Hz pings */
}

/* ------------------------------------------------------------------ credentials (NVS) */

static bool creds_load(void)
{
    nvs_handle_t h;
    if (nvs_open(NVS_NS, NVS_READONLY, &h) != ESP_OK) {
        return false;
    }
    size_t a = sizeof(s_ssid), b = sizeof(s_pass);
    bool ok = nvs_get_str(h, "ssid", s_ssid, &a) == ESP_OK && nvs_get_str(h, "pass", s_pass, &b) == ESP_OK && s_ssid[0];
    nvs_close(h);
    return ok;
}

static void creds_save(const char *ssid, const char *pass)
{
    nvs_handle_t h;
    ESP_ERROR_CHECK(nvs_open(NVS_NS, NVS_READWRITE, &h));
    nvs_set_str(h, "ssid", ssid);
    nvs_set_str(h, "pass", pass);
    nvs_commit(h);
    nvs_close(h);
}

static void creds_erase(void)
{
    nvs_handle_t h;
    if (nvs_open(NVS_NS, NVS_READWRITE, &h) == ESP_OK) {
        nvs_erase_all(h);
        nvs_commit(h);
        nvs_close(h);
    }
}

static int hexval(char c)
{
    if (c >= '0' && c <= '9') return c - '0';
    c = (char)tolower((unsigned char)c);
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return -1;
}

/* Decode hex into dst (NUL-terminated). Returns false on malformed input. */
static bool unhex(const char *src, char *dst, size_t cap)
{
    size_t n = strlen(src);
    if (n % 2 || n / 2 >= cap) return false;
    for (size_t i = 0; i < n; i += 2) {
        int hi = hexval(src[i]), lo = hexval(src[i + 1]);
        if (hi < 0 || lo < 0) return false;
        dst[i / 2] = (char)(hi * 16 + lo);
    }
    dst[n / 2] = 0;
    return true;
}

/* ------------------------------------------------------------------ USB commands */

static void handle_command(char *line)
{
    if (strncmp(line, "WISP_WIFI ", 10) == 0) {
        char *ssid_hex = strtok(line + 10, " ");
        char *pass_hex = strtok(NULL, " ");
        char ssid[33], pass[65];
        if (!ssid_hex || !unhex(ssid_hex, ssid, sizeof(ssid)) || !unhex(pass_hex ? pass_hex : "", pass, sizeof(pass))) {
            outf("WISP_ERROR bad_wifi_command\n");
            return;
        }
        creds_save(ssid, pass);
        outf("WISP_WIFI_SAVED ssid=\"%s\" — restarting\n", ssid);
        vTaskDelay(pdMS_TO_TICKS(300));
        esp_restart();
    } else if (strcmp(line, "WISP_FORGET") == 0) {
        creds_erase();
        outf("WISP_WIFI_FORGOTTEN — restarting\n");
        vTaskDelay(pdMS_TO_TICKS(300));
        esp_restart();
    } else if (strcmp(line, "WISP_STATUS") == 0) {
        bool up = xEventGroupGetBits(s_events) & GOT_IP_BIT;
        outf("WISP_STATUS fw=\"%s\" wifi=%s ssid=\"%s\" last_disconnect_reason=%d\n", WISP_FW_VERSION,
             s_ssid[0] ? (up ? "connected" : "connecting") : "unconfigured", s_ssid, s_disconnect_reason);
    }
}

static void command_task(void *arg)
{
    static char line[256];
    size_t len = 0;
    uint8_t buf[64];
    for (;;) {
        int n = usb_serial_jtag_read_bytes(buf, sizeof(buf), pdMS_TO_TICKS(100));
        for (int i = 0; i < n; i++) {
            char c = (char)buf[i];
            if (c == '\n' || c == '\r') {
                if (len) {
                    line[len] = 0;
                    handle_command(line);
                    len = 0;
                }
            } else if (len < sizeof(line) - 1) {
                line[len++] = c;
            }
        }
    }
}

/* ------------------------------------------------------------------ main */

void app_main(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);

    usb_serial_jtag_driver_config_t usb_cfg = USB_SERIAL_JTAG_DRIVER_CONFIG_DEFAULT();
    usb_cfg.tx_buffer_size = 8192;
    usb_cfg.rx_buffer_size = 512;
    ESP_ERROR_CHECK(usb_serial_jtag_driver_install(&usb_cfg));
    WISP_VFS_USE_DRIVER();

    s_events = xEventGroupCreate();
    xTaskCreate(command_task, "wisp_cmd", 4096, NULL, 5, NULL);

    if (!creds_load()) {
        for (;;) {
            outf("WISP_NEED_WIFI fw=\"%s\" — send: WISP_WIFI <ssid hex> <password hex>\n", WISP_FW_VERSION);
            vTaskDelay(pdMS_TO_TICKS(3000));
        }
    }

    outf("WISP_CONNECTING fw=\"%s\" ssid=\"%s\"\n", WISP_FW_VERSION, s_ssid);
    wifi_start();
    while (!(xEventGroupWaitBits(s_events, GOT_IP_BIT, pdFALSE, pdTRUE, pdMS_TO_TICKS(15000)) & GOT_IP_BIT)) {
        outf("WISP_WIFI_TIMEOUT ssid=\"%s\" last_reason=%d — still trying (check name/password, 2.4 GHz)\n", s_ssid, s_disconnect_reason);
    }
    wifi_csi_start();
    ping_router_start();
}
