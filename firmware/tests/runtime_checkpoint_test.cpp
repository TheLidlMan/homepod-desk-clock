#include <Arduino.h>
#include <cassert>
#include <cstdio>
#include "CrashDiagnostics.h"
uint32_t fakeMillis=0;FakeESP ESP;
extern "C" {void *umm_last_fail_alloc_addr=nullptr;int umm_last_fail_alloc_size=0;}
int main(){
#if defined(ESP8266)
 for(unsigned i=0;i<32;++i)ESP.memory[i]=0xa5a50000+i;
 loadCrashDiagnostics();FakeJson result;writeCrashDiagnostics({&result});
 assert(!result.fields["captured"]&&!result.fields["runtimeCheckpointCaptured"]);
 const unsigned initial=ESP.writes;fakeMillis=12345;checkpointRuntime(17);
 assert(ESP.writes==initial+1&&ESP.memory[97]==17&&ESP.memory[98]==12345);
 const unsigned before=ESP.writes;fakeMillis=23456;checkpointRuntime(17);
 assert(ESP.writes==before&&ESP.memory[98]==12345);
 // Simulated reboot: loader retains the previous phase for JSON and clears RTC.
 loadCrashDiagnostics();result={};writeCrashDiagnostics({&result});
 assert(!result.fields["captured"]&&result.fields["runtimeCheckpointCaptured"]);
 assert(result.fields["runtimePhase"]==17&&result.fields["runtimeUptimeMs"]==12345&&ESP.memory[96]==0);
 checkpointRuntime(18);clearRuntimeCheckpoint();loadCrashDiagnostics();
 result={};writeCrashDiagnostics({&result});assert(!result.fields["runtimeCheckpointCaptured"]);
 checkpointRuntime(19);ESP.memory[99]^=1;loadCrashDiagnostics();
 result={};writeCrashDiagnostics({&result});assert(!result.fields["runtimeCheckpointCaptured"]);
 // A failed write must remain retryable rather than caching a nonexistent phase.
 ESP.failWrite=true;unsigned failed=ESP.writes;checkpointRuntime(20);assert(ESP.writes==failed);
 ESP.failWrite=false;checkpointRuntime(20);assert(ESP.writes==failed+1);checkpointRuntime(0);assert(ESP.memory[96]==0);
 // Existing crash record remains compatible and both RTC ranges are disjoint.
 uint32_t old[24]={};old[0]=0x4d444331;old[1]=1;old[2]=3;old[3]=0x40101234;old[6]=1;old[7]=0x40105678;
 uint32_t check=0x4d444331;for(unsigned i=0;i<23;++i)check^=old[i];old[23]=check;
 std::memcpy(ESP.memory+32,old,sizeof(old));checkpointRuntime(21);loadCrashDiagnostics();
 result={};writeCrashDiagnostics({&result});assert(result.fields["captured"]&&result.fields["runtimeCheckpointCaptured"]&&result.fields["reason"]==1&&result.addresses.size()==1);
 for(unsigned i=0;i<32;++i)assert(ESP.memory[i]==0xa5a50000+i);
 for(unsigned i=56;i<96;++i)assert(ESP.memory[i]==0);
 for(unsigned i=100;i<128;++i)assert(ESP.memory[i]==0);
#else
 checkpointRuntime(17);clearRuntimeCheckpoint();loadCrashDiagnostics();FakeJson result;writeCrashDiagnostics({&result});
 assert(!result.fields["captured"]&&!result.fields["runtimeCheckpointCaptured"]&&ESP.writes==0);
#endif
 puts("RTC checkpoint regression passed");
}
