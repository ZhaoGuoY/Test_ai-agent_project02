import requests

# 测试 https://eu.makera.com/
print("=" * 60)
print("测试 https://eu.makera.com/")
print("=" * 60)
try:
    resp_eu = requests.get("https://eu.makera.com/", timeout=30)
    print(f"状态码: {resp_eu.status_code}")
    print(f"响应头:")
    for key, value in resp_eu.headers.items():
        print(f"  {key}: {value}")
except requests.exceptions.Timeout:
    print("请求超时（30秒）")
except requests.exceptions.ConnectionError as e:
    print(f"连接错误: {e}")
except Exception as e:
    print(f"其他错误: {e}")

print()

# 测试 https://makera.com/
print("=" * 60)
print("测试 https://makera.com/")
print("=" * 60)
try:
    resp_main = requests.get("https://makera.com/", timeout=30)
    print(f"状态码: {resp_main.status_code}")
    print(f"响应头:")
    for key, value in resp_main.headers.items():
        print(f"  {key}: {value}")
except requests.exceptions.Timeout:
    print("请求超时（30秒）")
except requests.exceptions.ConnectionError as e:
    print(f"连接错误: {e}")
except Exception as e:
    print(f"其他错误: {e}")
