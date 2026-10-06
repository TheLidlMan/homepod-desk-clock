"""Run with Home Assistant installed; no live services or credentials required."""
import importlib.util
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock
from datetime import datetime
from zoneinfo import ZoneInfo

path = os.environ.get("MINI_DISPLAY_WEATHER_MODULE", str(Path(__file__).parents[1] / "custom_components/mini_display/weather.py"))
spec = importlib.util.spec_from_file_location("weather_under_test", path)
weather = importlib.util.module_from_spec(spec)
spec.loader.exec_module(weather)
weather.dt_util.set_default_time_zone(ZoneInfo("Europe/Warsaw"))


class WeatherTests(unittest.IsolatedAsyncioTestCase):
    def test_tomorrow_is_calendar_day_not_second_item(self):
        now = datetime(2026, 9, 5, 23, 50, tzinfo=ZoneInfo("Europe/Warsaw"))
        tomorrow = {"datetime": "2026-09-05T22:00:00+00:00", "temperature": 0}
        self.assertIsNone(weather.select_forecast([tomorrow], "daily", 0, now))
        self.assertEqual(weather.select_forecast([tomorrow], "daily", 1, now), tomorrow)

    def test_hourly_dst_repeated_hour(self):
        tz = ZoneInfo("Europe/Warsaw")
        now = datetime(2026, 10, 25, 2, 30, tzinfo=tz, fold=0)
        first = {"datetime": "2026-10-25T00:00:00Z", "temperature": 1}
        second = {"datetime": "2026-10-25T01:00:00Z", "temperature": 2}
        self.assertEqual(weather.select_forecast([first, second], "hourly", 0, now), first)
        self.assertEqual(weather.select_forecast([first, second], "hourly", 1, now), second)

    def test_missing_values_are_not_zero(self):
        self.assertFalse(weather.encode_weather(None, "Now")["available"])
        value = weather.encode_weather({"condition": "sunny", "temperature": 0, "humidity": None}, "Now")
        self.assertTrue(value["available"])
        self.assertEqual(value["state"].split("|")[1], "0.0")
        self.assertEqual(value["state"].split("|")[3], "")
        invalid = weather.encode_weather({"temperature": float("nan"), "wind_speed": True}, "Now")
        self.assertEqual(invalid["state"].split("|")[1], "")
        self.assertEqual(invalid["state"].split("|")[5], "")

    def test_hourly_starts_with_first_available_hour(self):
        now = datetime(2026, 9, 5, 22, 30, tzinfo=ZoneInfo("Europe/Warsaw"))
        first = {"datetime": "2026-09-05T21:00:00Z"}
        second = {"datetime": "2026-09-05T22:00:00Z"}
        self.assertEqual(weather.select_forecast([first, second], "hourly", 0, now), first)
        self.assertEqual(weather.select_forecast([first, second], "hourly", 1, now), second)

    def test_day_night_skips_finished_day(self):
        now = datetime(2026, 9, 5, 23, tzinfo=ZoneInfo("Europe/Warsaw"))
        day = {"datetime": "2026-09-05T06:00:00+02:00"}
        night = {"datetime": "2026-09-05T18:00:00+02:00"}
        self.assertEqual(weather.select_forecast([day, night], "twice_daily", 0, now), night)

    def test_languages_do_not_overwrite_each_other(self):
        english = {"source": "weather.home", "weather": {"language": "en"}}
        polish = {"source": "weather.home", "weather": {"language": "pl"}}
        self.assertNotEqual(weather.weather_source(english, 0), weather.weather_source(polish, 0))

    def test_packet_bounds(self):
        value = weather.encode_weather(dict(condition="lightning-rainy", temperature=-999,
            templow=-999, humidity=100, precipitation_probability=100, wind_speed=9999), "Tomorrow")
        self.assertTrue(value["available"])
        self.assertLessEqual(len(value["state"].encode()), 48)

    def test_invalid_options(self):
        for settings in ({"count": 6}, {"fields": []}, {"fields": ["password"]}, {"count": True}, {"period": "invented"}):
            with self.assertRaises(ValueError):
                weather.validate_weather({"source": "weather.home", "weather": settings}, "/", ValueError)

    async def test_cache_deduplicates_concurrent_requests(self):
        call = AsyncMock(return_value={"weather.home": {"forecast": [{"temperature": 12}]}})
        data = weather.WeatherData(SimpleNamespace(services=SimpleNamespace(async_call=call)))
        import asyncio
        await asyncio.gather(data.forecast("weather.home", "daily"), data.forecast("weather.home", "daily"))
        self.assertEqual(call.await_count, 1)
        self.assertEqual(call.call_args.args[:2], ("weather", "get_forecasts"))
        self.assertTrue(call.call_args.kwargs["return_response"])

    async def test_error_backoff_does_not_return_stale_forecast(self):
        call = AsyncMock(side_effect=weather.HomeAssistantError("offline"))
        data = weather.WeatherData(SimpleNamespace(services=SimpleNamespace(async_call=call)))
        data.cache[("weather.home", "daily")] = (0, [{"temperature": 35}])
        self.assertEqual(await data.forecast("weather.home", "daily"), [])
        self.assertEqual(await data.forecast("weather.home", "daily"), [])
        self.assertEqual(call.await_count, 1)

    async def test_current_uses_ha_attributes_without_forecast_call(self):
        state = SimpleNamespace(state="rainy", attributes={"temperature": 4.5, "temperature_unit": "°C"})
        hass = SimpleNamespace(states=SimpleNamespace(get=lambda _: state), services=SimpleNamespace(async_call=AsyncMock()))
        data = weather.WeatherData(hass)
        card = {"type": "weather", "source": "weather.home"}
        values = await data.values({"pages": [{"rows": [{"cards": [card]}]}]}, compile_cards=True)
        self.assertEqual(card["weather"]["temperatureUnit"], "°C")
        self.assertEqual(len(values), 1)
        self.assertEqual(next(iter(values.values()))["state"].split("|")[1], "4.5")
        hass.services.async_call.assert_not_called()


if __name__ == "__main__":
    unittest.main()
