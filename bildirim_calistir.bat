@echo off
REM ============================================
REM FonTakip - Bildirim Botu Zamanli Gorev
REM Bu dosyayi Windows Gorev Zamanlayici ile
REM gunluk olarak calistirin.
REM ============================================

cd /d "%~dp0"
set PYTHONIOENCODING=utf8
echo [%date% %time%] FonTakip bildirim botu calisiyor...
python bildirim_bot.py
echo [%date% %time%] Tamamlandi.
pause
