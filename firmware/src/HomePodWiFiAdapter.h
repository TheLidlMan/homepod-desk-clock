#ifndef HOMEPOD_WIFI_ADAPTER_H
#define HOMEPOD_WIFI_ADAPTER_H
#include <ESP8266WiFi.h>
extern "C" {
#include "homepod_observer.h"
}
struct HomePodWiFiAdapter {
    struct Channel { WiFiClient client;HomePodWiFiAdapter *owner=nullptr; } channels[3];
    IPAddress address;
    bool used[3]={false,false,false};
    uint32_t budgetStarted=0,budgetMillis=0;
    uint8_t lastPhase=0;
    explicit HomePodWiFiAdapter(const IPAddress &ip):address(ip) {for(auto &channel:channels)channel.owner=this;}
    void beginBudget(uint32_t amount) {budgetStarted=millis();budgetMillis=amount;}
    bool alive() const {return !budgetMillis || millis()-budgetStarted<budgetMillis;}
    void trace(uint8_t phase);
    homepod_factory factory();
};
#endif
