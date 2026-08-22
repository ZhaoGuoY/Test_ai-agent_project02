# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/global_carvera.spec.ts >> Global 站点 >> 商品加入购物车
- Location: src/web/testcases/smoke/global_carvera.spec.ts:37:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "/products/"
Received string:    "https://www.makera.com/?utm_source=Makera+Global"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic:
    - generic:
      - generic:
        - img
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#MainContent"
  - generic:
    - img
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e8]:
        - generic [ref=e10]:
          - link "Back-to-School Sale is LIVE. Save up to $539." [ref=e11] [cursor=pointer]:
            - /url: /pages/2026-back-to-school-sale
          - link "Shop Now" [ref=e12] [cursor=pointer]:
            - /url: /pages/2026-back-to-school-sale
            - text: Shop Now
            - img [ref=e13]
        - generic:
          - generic:
            - link:
              - /url: /products/makera-z1-desktop-cnc
              - text: New Launch! The Makera Z1 Pre-Order Is Live.
            - link:
              - /url: /products/makera-z1-desktop-cnc
              - text: Shop Now
              - img
      - button "Previous" [ref=e15] [cursor=pointer]:
        - img [ref=e16]
      - button "Next" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
      - button "Pause slideshow" [ref=e21] [cursor=pointer]:
        - generic [ref=e22]:
          - img [ref=e23]
          - generic [ref=e25]: Pause slideshow
    - combobox "Language" [ref=e27]:
      - button "English" [ref=e28] [cursor=pointer]:
        - img [ref=e29]
        - generic [ref=e33]: English
        - img [ref=e34]
    - generic [ref=e41] [cursor=pointer]: United States (EN)
  - banner [ref=e42]:
    - heading "Makera" [level=1] [ref=e43]:
      - generic [ref=e44]: Makera
      - link [ref=e45] [cursor=pointer]:
        - /url: /
    - navigation "Primary" [ref=e47]:
      - list [ref=e48]:
        - listitem [ref=e49]:
          - group [ref=e50]:
            - generic "Products" [ref=e51]:
              - generic [ref=e52] [cursor=pointer]:
                - generic: Products
                - img [ref=e53]
        - listitem [ref=e55]:
          - link "Makera Z1 New" [ref=e56] [cursor=pointer]:
            - /url: /products/makera-z1-desktop-cnc
            - generic: Makera Z1
            - generic [ref=e57]: New
        - listitem [ref=e58]:
          - link "Back to School Sale" [ref=e59] [cursor=pointer]:
            - /url: /pages/2026-back-to-school-sale
            - generic: Back to School Sale
        - listitem [ref=e60]:
          - link "Makerables" [ref=e61] [cursor=pointer]:
            - /url: https://www.makerables.com/
            - generic: Makerables
        - listitem [ref=e62]:
          - group [ref=e63]:
            - generic "Software" [ref=e64]:
              - generic [ref=e65] [cursor=pointer]:
                - generic: Software
                - img [ref=e66]
        - listitem [ref=e68]:
          - group [ref=e69]:
            - generic "Explore" [ref=e70]:
              - generic [ref=e71] [cursor=pointer]:
                - generic: Explore
                - img [ref=e72]
        - listitem [ref=e74]:
          - group [ref=e75]:
            - generic "Support" [ref=e76]:
              - generic [ref=e77] [cursor=pointer]:
                - generic: Support
                - img [ref=e78]
    - generic [ref=e81]:
      - link "Search" [ref=e82] [cursor=pointer]:
        - /url: /search
        - generic [ref=e83]: Search
        - img [ref=e84]
      - button "Login" [ref=e86] [cursor=pointer]:
        - generic [ref=e87]: Login
        - img [ref=e88]
      - link "My Cart 0 items" [ref=e91] [cursor=pointer]:
        - /url: /cart
        - generic [ref=e92]: My Cart
        - img [ref=e93]
        - generic "0 items" [ref=e97]: "0"
  - generic [ref=e98]:
    - main [ref=e99]:
      - generic [ref=e102]:
        - button "Pause slideshow" [ref=e103] [cursor=pointer]:
          - generic [ref=e104]:
            - img [ref=e105]
            - generic [ref=e106]: Pause slideshow
        - generic [ref=e109]:
          - link [ref=e114] [cursor=pointer]:
            - /url: /pages/2026-back-to-school-sale
          - link [ref=e119] [cursor=pointer]:
            - /url: /products/makera-z1-desktop-cnc
          - link [ref=e124] [cursor=pointer]:
            - /url: /products/carvera-air
          - link [ref=e129] [cursor=pointer]:
            - /url: /products/carvera
        - generic:
          - generic:
            - generic:
              - button "Previous" [ref=e130] [cursor=pointer]:
                - img [ref=e131]
              - generic [ref=e134]:
                - button "Page 1" [ref=e135] [cursor=pointer]:
                  - generic [ref=e136]: Page 1
                - button "Page 2" [ref=e137] [cursor=pointer]:
                  - generic [ref=e138]: Page 2
                - button "Page 3" [ref=e139] [cursor=pointer]:
                  - generic [ref=e140]: Page 3
                - button "Page 4" [ref=e141] [cursor=pointer]:
                  - generic [ref=e142]: Page 4
              - button "Next" [ref=e143] [cursor=pointer]:
                - img [ref=e144]
      - generic [ref=e149]:
        - heading "M in Product" [level=2] [ref=e151]:
          - generic [ref=e152]: M
          - generic [ref=e153]: in Product
        - generic [ref=e154]:
          - link "Carvera Air Desktop CNC Machine The Versatile Workhorse of Desktop CNC See all reviews 77 reviews Learn More" [ref=e155] [cursor=pointer]:
            - /url: /products/carvera-air
            - generic [ref=e156]:
              - generic [ref=e157]:
                - heading "Carvera Air Desktop CNC Machine" [level=2] [ref=e158]
                - generic [ref=e159]: The Versatile Workhorse of Desktop CNC
                - generic [ref=e161]:
                  - button "See all reviews" [ref=e162]:
                    - generic [ref=e163]: 
                    - generic [ref=e164]: 
                    - generic [ref=e165]: 
                    - generic [ref=e166]: 
                    - generic [ref=e167]: 
                  - text: 77 reviews
              - img [ref=e170]
            - generic [ref=e171]:
              - generic [ref=e172]:
                - img [ref=e174]
                - img [ref=e176]
              - generic [ref=e178]:
                - generic: Learn More
          - link "Carvera Desktop CNC Machine The Ultimate Smart Desktop CNC See all reviews 44 reviews Learn More" [ref=e179] [cursor=pointer]:
            - /url: /products/carvera
            - generic [ref=e180]:
              - generic [ref=e181]:
                - heading "Carvera Desktop CNC Machine" [level=2] [ref=e182]
                - generic [ref=e183]: The Ultimate Smart Desktop CNC
                - generic [ref=e185]:
                  - button "See all reviews" [ref=e186]:
                    - generic [ref=e187]: 
                    - generic [ref=e188]: 
                    - generic [ref=e189]: 
                    - generic [ref=e190]: 
                    - generic [ref=e191]: 
                  - text: 44 reviews
              - img [ref=e194]
            - generic [ref=e195]:
              - generic [ref=e196]:
                - img [ref=e198]
                - img [ref=e200]
              - generic [ref=e202]:
                - generic: Learn More
          - link "Makera Z1 Desktop CNC [Pre-order] The Go-To Entry-Level Desktop CNC See all reviews 12 reviews Learn More" [ref=e203] [cursor=pointer]:
            - /url: /products/makera-z1-desktop-cnc
            - generic [ref=e204]:
              - generic [ref=e205]:
                - heading "Makera Z1 Desktop CNC [Pre-order]" [level=2] [ref=e206]
                - generic [ref=e207]: The Go-To Entry-Level Desktop CNC
                - generic [ref=e209]:
                  - button "See all reviews" [ref=e210]:
                    - generic [ref=e211]: 
                    - generic [ref=e212]: 
                    - generic [ref=e213]: 
                    - generic [ref=e214]: 
                    - generic [ref=e215]: 
                  - text: 12 reviews
              - img [ref=e218]
            - generic [ref=e219]:
              - generic [ref=e220]:
                - img [ref=e222]
                - img [ref=e224]
              - generic [ref=e226]:
                - generic: Learn More
      - generic [ref=e229]:
        - generic [ref=e230]:
          - heading "Hot-Selling Add-ons" [level=2] [ref=e232]:
            - generic [ref=e233]: Hot-Selling Add-ons
          - generic [ref=e235]:
            - button "Previous slide" [disabled]:
              - img
            - button "Next slide" [ref=e236] [cursor=pointer]:
              - img [ref=e237]
        - generic [ref=e240]:
          - generic [ref=e241]:
            - group "1 / 6" [ref=e242]:
              - link "New Launch Makera Cyclone Dust Collector Learn More" [ref=e243] [cursor=pointer]:
                - /url: /products/makera-cyclone-dust-collector
                - generic [ref=e244]:
                  - generic [ref=e246]: New Launch
                  - img [ref=e249]
                - generic [ref=e250]:
                  - heading "Makera Cyclone Dust Collector" [level=2] [ref=e251]
                  - generic [ref=e252]:
                    - generic [ref=e253]: Learn More
                    - img [ref=e254]
            - group "2 / 6" [ref=e256]:
              - link "Best Seller Carvera 4th Axis Module Harmonic Drive Learn More" [ref=e257] [cursor=pointer]:
                - /url: /products/carvera-4th-axis-module
                - generic [ref=e258]:
                  - generic [ref=e260]: Best Seller
                  - img [ref=e263]
                - generic [ref=e264]:
                  - heading "Carvera 4th Axis Module Harmonic Drive" [level=2] [ref=e265]
                  - generic [ref=e266]:
                    - generic [ref=e267]: Learn More
                    - img [ref=e268]
            - group "3 / 6" [ref=e270]:
              - link "New Arrivals Carvera Air 4th Axis Module One More Axis, Much More Possibilities. Learn More" [ref=e271] [cursor=pointer]:
                - /url: /products/carvera-air-4th-axis-module
                - generic [ref=e272]:
                  - generic [ref=e274]: New Arrivals
                  - img [ref=e277]
                - generic [ref=e278]:
                  - heading "Carvera Air 4th Axis Module" [level=2] [ref=e279]
                  - generic [ref=e280]: One More Axis, Much More Possibilities.
                  - generic [ref=e281]:
                    - generic [ref=e282]: Learn More
                    - img [ref=e283]
            - group "4 / 6" [ref=e285]:
              - link "Hot Carvera Air Laser Module Learn More" [ref=e286] [cursor=pointer]:
                - /url: /products/carvera-air-laser-module
                - generic [ref=e287]:
                  - generic [ref=e289]: Hot
                  - img [ref=e292]
                - generic [ref=e293]:
                  - heading "Carvera Air Laser Module" [level=2] [ref=e294]
                  - generic [ref=e295]:
                    - generic [ref=e296]: Learn More
                    - img [ref=e297]
            - group "5 / 6" [ref=e299]:
              - link "1.5mm Blank PCB Boards Learn More" [ref=e300] [cursor=pointer]:
                - /url: /products/1-5mm-blank-pcb-boards-1
                - img [ref=e304]
                - generic [ref=e305]:
                  - heading "1.5mm Blank PCB Boards" [level=2] [ref=e306]
                  - generic [ref=e307]:
                    - generic [ref=e308]: Learn More
                    - img [ref=e309]
            - group "6 / 6" [ref=e311]:
              - link "3MM Spindle Collet Learn More" [ref=e312] [cursor=pointer]:
                - /url: /products/3mm-spindle-collet
                - img [ref=e316]
                - generic [ref=e317]:
                  - heading "3MM Spindle Collet" [level=2] [ref=e318]
                  - generic [ref=e319]:
                    - generic [ref=e320]: Learn More
                    - img [ref=e321]
          - generic [ref=e323]:
            - button "Go to slide 1" [ref=e324] [cursor=pointer]
            - button "Go to slide 2" [ref=e325] [cursor=pointer]
            - button "Go to slide 3" [ref=e326] [cursor=pointer]
            - button "Go to slide 4" [ref=e327] [cursor=pointer]
      - generic [ref=e331]:
        - heading "Explore by Category" [level=2] [ref=e332]
        - generic [ref=e333]:
          - link "Desktop CNC" [ref=e334] [cursor=pointer]:
            - /url: /collections/machines
            - generic [ref=e337]: Desktop CNC
          - link "Spare Parts" [ref=e338] [cursor=pointer]:
            - /url: /collections/spare-parts
            - generic [ref=e341]: Spare Parts
          - link "Accessories" [ref=e342] [cursor=pointer]:
            - /url: /collections/accessories
            - generic [ref=e345]: Accessories
          - link "Toolkits" [ref=e346] [cursor=pointer]:
            - /url: /collections/maker-toolkit-series
            - generic [ref=e349]: Toolkits
          - link "CNC Bits" [ref=e350] [cursor=pointer]:
            - /url: /collections/cnc-bits
            - generic [ref=e353]: CNC Bits
          - link "Materials" [ref=e354] [cursor=pointer]:
            - /url: /collections/materials
            - generic [ref=e357]: Materials
          - link "Add-ons" [ref=e358] [cursor=pointer]:
            - /url: /collections/add-ons
            - generic [ref=e361]: Add-ons
          - link "Brand Merch" [ref=e362] [cursor=pointer]:
            - /url: /collections/brand-merch
            - generic [ref=e365]: Brand Merch
      - generic [ref=e370]:
        - generic [ref=e372]:
          - heading "Why M kera?" [level=2] [ref=e374]:
            - generic [ref=e375]: Why M
            - generic [ref=e376]: kera?
          - generic [ref=e384]:
            - heading "Makera's World-First Innovations:" [level=3] [ref=e385]:
              - paragraph [ref=e386]: "Makera's World-First Innovations:"
            - generic [ref=e389]:
              - group "1 / 6" [ref=e390] [cursor=pointer]: Smart
              - group "2 / 6" [ref=e391] [cursor=pointer]: Easy
              - group "3 / 6" [ref=e392] [cursor=pointer]: Precise
              - group "4 / 6" [ref=e394] [cursor=pointer]: Versitile
              - group "5 / 6" [ref=e395] [cursor=pointer]: Clean
              - group "6 / 6" [ref=e396] [cursor=pointer]: Quiet
            - paragraph [ref=e398]:
              - text: For the first time in the world, Carvera brings a closed-loop system into a compact desktop form factor, for complete control and precision.
              - text: Every Carvera is fully assembled, fine tuned and tested before it leaves our factory.
        - heading "Why Makera?" [level=2] [ref=e400]
      - generic [ref=e403]:
        - img [ref=e407]
        - generic [ref=e408]:
          - generic [ref=e409]:
            - heading "Amazingly Simple CAM Software" [level=2] [ref=e410]:
              - paragraph [ref=e411]: Amazingly Simple
              - paragraph [ref=e412]: CAM Software
            - paragraph [ref=e414]: Makera CAM
            - paragraph [ref=e416]:
              - text: A powerful yet easy-to-use CAM software that supports a variety of path types, unleashing the full potential of your Carvera and Carvera Air.
              - link "Learn More" [ref=e417] [cursor=pointer]:
                - /url: /pages/makera-cam
          - region [ref=e418]:
            - generic [ref=e419]:
              - group "3 of 15":
                - generic:
                  - img
              - group "4 of 15":
                - generic:
                  - img
              - group "5 of 15":
                - generic:
                  - img
              - group "6 of 15":
                - generic:
                  - img
              - group "7 of 15":
                - generic:
                  - img
              - group "8 of 15":
                - generic:
                  - img
              - group "9 of 15":
                - generic:
                  - img
              - group "10 of 15":
                - generic:
                  - img
              - group "11 of 15":
                - generic:
                  - img
              - group "12 of 15":
                - generic:
                  - img
              - group "13 of 15":
                - generic:
                  - img
              - group "14 of 15":
                - generic:
                  - img
              - group "15 of 15":
                - generic:
                  - img
              - group "1 of 15":
                - generic:
                  - img
              - group "2 of 15":
                - generic:
                  - img
              - group "3 of 15":
                - generic:
                  - img
              - group "4 of 15":
                - generic:
                  - img
              - group "5 of 15":
                - generic:
                  - img
              - group "6 of 15":
                - generic:
                  - img
              - group "7 of 15":
                - generic:
                  - img
              - group "8 of 15":
                - generic:
                  - img
              - group "9 of 15":
                - generic:
                  - img
              - group "10 of 15":
                - generic:
                  - img
              - group "11 of 15":
                - generic:
                  - img
              - group "12 of 15":
                - generic:
                  - img
              - group "13 of 15":
                - generic:
                  - img
              - group "14 of 15":
                - generic:
                  - img
              - group "15 of 15":
                - generic:
                  - img
              - group "1 of 15":
                - generic:
                  - img
              - group "2 of 15":
                - generic:
                  - img
              - group "3 of 15":
                - generic:
                  - img
              - group "4 of 15":
                - generic:
                  - img
              - group "5 of 15":
                - generic:
                  - img
              - group "6 of 15":
                - generic:
                  - img
              - group "7 of 15":
                - generic:
                  - img
              - group "8 of 15":
                - generic:
                  - img
              - group "9 of 15":
                - generic:
                  - img
              - group "10 of 15":
                - generic:
                  - img
              - group "11 of 15":
                - generic:
                  - img
              - group "12 of 15":
                - generic:
                  - img
              - group "13 of 15":
                - generic:
                  - img
              - group "14 of 15":
                - generic:
                  - img
              - group "15 of 15":
                - generic:
                  - img
      - generic [ref=e422]:
        - heading "Aw rds & Reviews" [level=2] [ref=e424]:
          - generic [ref=e425]: Aw
          - generic [ref=e426]: rds & Reviews
        - generic [ref=e427]:
          - generic [ref=e428]:
            - generic [ref=e429]:
              - group "4 / 5" [ref=e430]:
                - img [ref=e432]
                - paragraph [ref=e435]: Makera Z1 delivers industrial-grade performance in a compact form factor while still offering significant precision
              - group "5 / 5" [ref=e436]:
                - img [ref=e438]
                - paragraph [ref=e441]: Carvera is a desktop CNC mill with a bunch of features that seem to make it perfect for PCB prototyping.
              - group "1 / 5" [ref=e442]:
                - img [ref=e444]
                - paragraph [ref=e447]: Accessibility to CNC machining is transforming, and the Makera Carvera series is on the front line of the revolution.
              - group "2 / 5" [ref=e448]:
                - img [ref=e450]
                - paragraph [ref=e453]: For many users, the Z1 delivers an uncommon balance of industrial-grade precision and truly intuitive usability.
              - group "3 / 5" [ref=e454]:
                - img [ref=e456]
                - paragraph [ref=e459]: As a leader in intelligent desktop CNC technology, Makera is lowering the barriers to creation through innovation and user-centric design, empowering more people to turn their ideas into reality with the help of technology.
              - group "4 / 5" [ref=e460]:
                - img [ref=e462]
                - paragraph [ref=e465]: Makera Z1 delivers industrial-grade performance in a compact form factor while still offering significant precision
              - group "5 / 5" [ref=e466]:
                - img [ref=e468]
                - paragraph [ref=e471]: Carvera is a desktop CNC mill with a bunch of features that seem to make it perfect for PCB prototyping.
              - group "1 / 5" [ref=e472]:
                - img [ref=e474]
                - paragraph [ref=e477]: Accessibility to CNC machining is transforming, and the Makera Carvera series is on the front line of the revolution.
              - group "2 / 5" [ref=e478]:
                - img [ref=e480]
                - paragraph [ref=e483]: For many users, the Z1 delivers an uncommon balance of industrial-grade precision and truly intuitive usability.
            - generic [ref=e484]:
              - button "Go to slide 1" [ref=e485] [cursor=pointer]
              - button "Go to slide 2" [ref=e486] [cursor=pointer]
              - button "Go to slide 3" [ref=e487] [cursor=pointer]
              - button "Go to slide 4" [ref=e488] [cursor=pointer]
              - button "Go to slide 5" [ref=e489] [cursor=pointer]
          - img [ref=e491]
      - generic [ref=e494]:
        - generic [ref=e495]:
          - heading "What Experts Say About Makera" [level=3] [ref=e497]:
            - text: What
            - emphasis [ref=e498]: Experts Say
            - text: About Makera
          - generic [ref=e500]:
            - img [ref=e502] [cursor=pointer]
            - img [ref=e506] [cursor=pointer]
        - generic [ref=e512]:
          - generic [ref=e514]:
            - generic [ref=e516] [cursor=pointer]:
              - img [ref=e517]
              - iframe [ref=e579]:
                - generic [active] [ref=f266e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f266e3]
                  - generic [ref=f266e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f266e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f266e12] [cursor=pointer]
                        - generic [ref=f266e14]:
                          - generic [ref=f266e19]:
                            - generic [ref=f266e20]:
                              - link "BambuLab of CNC Milling? Makera Carvera Air Desktop Mill Reviewed" [ref=f266e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=WR7ROCYbwcc
                              - link "My Tech Fun" [ref=f266e22] [cursor=pointer]:
                                - /url: /channel/UC6QckhILSqdl3K0TWPWrDdg
                                - generic [ref=f266e23]: My Tech Fun
                            - generic [ref=f266e24]:
                              - button [ref=f266e25] [cursor=pointer]
                              - generic [ref=f266e27]:
                                - generic: My Tech Fun
                                - generic: チャンネル登録者数 9.19万人
                          - generic [ref=f266e28]:
                            - button "共有" [ref=f266e31] [cursor=pointer]:
                              - generic [ref=f266e35]:
                                - img
                            - link "YouTube で見る" [ref=f266e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=WR7ROCYbwcc
                              - generic [ref=f266e45]:
                                - text: 見る
                                - img [ref=f266e47]:
                                  - generic [ref=f266e49]:
                                    - img
            - generic [ref=e580]:
              - generic [ref=e581]:
                - img [ref=e583]
                - paragraph [ref=e585]: My Tech Fun
              - paragraph [ref=e587]: Extremely good hardware with the following things around it, the software controller and CAM software，materials, tools, profile for those tools and materials in the CAM software. Huge advantage of this product is the CAM software.
          - generic [ref=e589]:
            - generic [ref=e591] [cursor=pointer]:
              - img [ref=e592]
              - iframe [ref=e654]:
                - generic [active] [ref=f268e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f268e3]
                  - generic [ref=f268e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f268e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f268e12] [cursor=pointer]
                        - generic [ref=f268e14]:
                          - generic [ref=f268e19]:
                            - generic [ref=f268e20]:
                              - link "How I Made My Own iPhone from a Block of Aluminum" [ref=f268e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=Yrl4OmS3bBA
                              - link "Strange Parts" [ref=f268e22] [cursor=pointer]:
                                - /url: /channel/UCO8DQrSp5yEP937qNqTooOw
                                - generic [ref=f268e23]: Strange Parts
                            - generic [ref=f268e24]:
                              - button [ref=f268e25] [cursor=pointer]
                              - generic [ref=f268e27]:
                                - generic: Strange Parts
                                - generic: チャンネル登録者数 196万人
                          - generic [ref=f268e28]:
                            - button "共有" [ref=f268e31] [cursor=pointer]:
                              - generic [ref=f268e35]:
                                - img
                            - link "YouTube で見る" [ref=f268e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=Yrl4OmS3bBA
                              - generic [ref=f268e45]:
                                - text: 見る
                                - img [ref=f268e47]:
                                  - generic [ref=f268e49]:
                                    - img
            - generic [ref=e655]:
              - generic [ref=e656]:
                - img [ref=e658]
                - paragraph [ref=e660]:
                  - strong [ref=e661]: Strange Parts
              - paragraph [ref=e663]: It's a desktop mill designed for makers to work right out of the box, with features you'd expect on much larger more expensive machines. It includes a 6-position automatic tool changer, so you don't have to change the tool AKA the bits yourself, which is huge time saver on complex projects.
          - generic [ref=e665]:
            - generic [ref=e667] [cursor=pointer]:
              - img [ref=e668]
              - iframe [ref=e730]:
                - generic [active] [ref=f270e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f270e3]
                  - generic [ref=f270e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f270e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f270e12] [cursor=pointer]
                        - generic [ref=f270e14]:
                          - generic [ref=f270e19]:
                            - generic [ref=f270e20]:
                              - link "The BEST 4 Axis Desktop CNC Machine?" [ref=f270e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=ffZlPlssL-s
                              - link "TAOW" [ref=f270e22] [cursor=pointer]:
                                - /url: /channel/UCpV7D0LoRbYhdx2G-whWyog
                                - generic [ref=f270e23]: TAOW
                            - generic [ref=f270e24]:
                              - button [ref=f270e25] [cursor=pointer]
                              - generic [ref=f270e27]:
                                - generic: TAOW
                                - generic: チャンネル登録者数 26.4万人
                          - generic [ref=f270e28]:
                            - button "共有" [ref=f270e31] [cursor=pointer]:
                              - generic [ref=f270e35]:
                                - img
                            - link "YouTube で見る" [ref=f270e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=ffZlPlssL-s
                              - generic [ref=f270e45]:
                                - text: 見る
                                - img [ref=f270e47]:
                                  - generic [ref=f270e49]:
                                    - img
            - generic [ref=e731]:
              - generic [ref=e732]:
                - img [ref=e734]
                - paragraph [ref=e736]:
                  - strong [ref=e737]: TAOW
              - paragraph [ref=e739]: "\"The automatic tool changer, wireless touch probe and 4th axis seamlessly bring an incredible amount of automation to the Carvera CNC. Parts that used to need manual tool changes and multiple setups can now be fully automated, removing lots of manual steps and making the whole machining process more enjoyable.\""
          - generic [ref=e741]:
            - generic [ref=e743] [cursor=pointer]:
              - img [ref=e744]
              - iframe [ref=e806]:
                - generic [active] [ref=f272e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f272e3]
                  - generic [ref=f272e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f272e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f272e12] [cursor=pointer]
                        - generic [ref=f272e14]:
                          - generic [ref=f272e19]:
                            - generic [ref=f272e20]:
                              - link "Makera Carvera Auto Tool Changer Benchtop CNC machine, In-depth review, aluminum cutting stress test" [ref=f272e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=zN7eEzAqI3A
                              - link "Aurora Tech" [ref=f272e22] [cursor=pointer]:
                                - /url: /channel/UCGER4yfUXubhNVPYoNzBSEA
                                - generic [ref=f272e23]: Aurora Tech
                            - generic [ref=f272e24]:
                              - button [ref=f272e25] [cursor=pointer]
                              - generic [ref=f272e27]:
                                - generic: Aurora Tech
                                - generic: チャンネル登録者数 12.4万人
                          - generic [ref=f272e28]:
                            - button "共有" [ref=f272e31] [cursor=pointer]:
                              - generic [ref=f272e35]:
                                - img
                            - link "YouTube で見る" [ref=f272e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=zN7eEzAqI3A
                              - generic [ref=f272e45]:
                                - text: 見る
                                - img [ref=f272e47]:
                                  - generic [ref=f272e49]:
                                    - img
            - generic [ref=e807]:
              - generic [ref=e808]:
                - img [ref=e810]
                - paragraph [ref=e812]:
                  - strong [ref=e813]: AuroraTech
              - paragraph [ref=e815]: “Carvera is indeed the most advanced CNC machine I have ever used. With the Carvera CNC, I can now design parts solely based on their functionality without worrying about tool changes during the job. This eliminates the need for manual tool height adjustment and significantly reduces the risk of human errors. As a result, the success rate of CNC jobs is greatly increased.”
      - generic [ref=e818]:
        - generic [ref=e819]:
          - heading "Blog Posts" [level=2] [ref=e821]
          - generic [ref=e823]:
            - button "Previous slide" [disabled]:
              - img
            - button "Next slide" [ref=e824] [cursor=pointer]:
              - img [ref=e825]
        - generic [ref=e829]:
          - group "1 / 6" [ref=e830]
          - group "2 / 6" [ref=e831]
          - group "3 / 6" [ref=e832]
          - group "4 / 6" [ref=e833]
          - group "5 / 6" [ref=e834]
          - group "6 / 6" [ref=e835]
    - generic [ref=e836]:
      - generic [ref=e840]:
        - generic [ref=e841]:
          - img [ref=e843]
          - generic [ref=e846]:
            - paragraph [ref=e847]: 30-Day Return
            - paragraph [ref=e849]: Changed your mind? Send it back for a refund!
        - generic [ref=e850]:
          - img [ref=e852]
          - generic [ref=e855]:
            - paragraph [ref=e856]: Free Shipping
            - paragraph [ref=e858]: For orders over $100, shipped straight to your door, for Free！
        - generic [ref=e859]:
          - img [ref=e861]
          - generic [ref=e864]:
            - paragraph [ref=e865]: 1 Year Warranty
            - paragraph [ref=e867]: Manufacturer defects covered, worry free product enjoyment!
        - generic [ref=e868]:
          - img [ref=e870]
          - generic [ref=e875]:
            - paragraph [ref=e876]: 24/7 Service
            - paragraph [ref=e878]: A 24/7 online specialist is at your disposal to solve your problems.
      - contentinfo [ref=e881]:
        - generic [ref=e883]:
          - paragraph [ref=e885]: Be the first to receive our latest product updates, newest offerings, and free product trials.
          - generic [ref=e886]:
            - generic [ref=e888]:
              - textbox "Email" [ref=e889]
              - generic: Email
              - button "Subscribe" [ref=e891] [cursor=pointer]:
                - generic: Sign Up
            - paragraph [ref=e893]:
              - text: By signing up, you agree to Makera’s
              - link "Privacy Policy" [ref=e894] [cursor=pointer]:
                - /url: /
              - text: and
              - link "Terms of use" [ref=e895] [cursor=pointer]:
                - /url: /
              - text: .
        - generic [ref=e897]:
          - group [ref=e898]:
            - generic "Support":
              - generic: Support
            - list [ref=e900]:
              - listitem [ref=e901]:
                - link "Support" [ref=e902] [cursor=pointer]:
                  - /url: /pages/all-support
              - listitem [ref=e903]:
                - link "FAQ" [ref=e904] [cursor=pointer]:
                  - /url: /pages/faq
              - listitem [ref=e905]:
                - link "Track My Order" [ref=e906] [cursor=pointer]:
                  - /url: https://www.makera.com/apps/trackmyorder
              - listitem [ref=e907]:
                - link "Student & Teacher Discounts" [ref=e908] [cursor=pointer]:
                  - /url: https://www.makera.com/pages/student-discount
              - listitem [ref=e909]:
                - link "Contact Us" [ref=e910] [cursor=pointer]:
                  - /url: /pages/contact
              - listitem [ref=e911]:
                - link "Manual & Examples" [ref=e912] [cursor=pointer]:
                  - /url: /pages/carvera-manual-examples
              - listitem [ref=e913]:
                - link "Official Wiki" [ref=e914] [cursor=pointer]:
                  - /url: https://wiki.makera.com/
              - listitem [ref=e915]:
                - link "About Us" [ref=e916] [cursor=pointer]:
                  - /url: /pages/about-us
          - group [ref=e917]:
            - generic "Community":
              - generic: Community
            - list [ref=e919]:
              - listitem [ref=e920]:
                - link "Facebook Carvera Group" [ref=e921] [cursor=pointer]:
                  - /url: https://www.facebook.com/groups/carvera
              - listitem [ref=e922]:
                - link "Facebook Carvera Air Group" [ref=e923] [cursor=pointer]:
                  - /url: https://www.facebook.com/groups/carveraair/
              - listitem [ref=e924]:
                - link "YouTube Channel" [ref=e925] [cursor=pointer]:
                  - /url: https://www.youtube.com/c/Makera
              - listitem [ref=e926]:
                - link "Discord Group" [ref=e927] [cursor=pointer]:
                  - /url: https://discord.com/invite/NQ5r9jGNXV
              - listitem [ref=e928]:
                - link "Loyalty Program" [ref=e929] [cursor=pointer]:
                  - /url: https://www.makera.com/pages/points-page
              - listitem [ref=e930]:
                - link "Affiliate Program" [ref=e931] [cursor=pointer]:
                  - /url: /pages/affiliate-page
          - group [ref=e932]:
            - generic "Policy":
              - generic: Policy
            - list [ref=e934]:
              - listitem [ref=e935]:
                - link "Terms of Service" [ref=e936] [cursor=pointer]:
                  - /url: /policies/terms-of-service
              - listitem [ref=e937]:
                - link "Privacy Policy" [ref=e938] [cursor=pointer]:
                  - /url: /policies/privacy-policy
              - listitem [ref=e939]:
                - link "Shipping Policy" [ref=e940] [cursor=pointer]:
                  - /url: /policies/shipping-policy
              - listitem [ref=e941]:
                - link "Refund & Return Policy" [ref=e942] [cursor=pointer]:
                  - /url: /policies/refund-policy
              - listitem [ref=e943]:
                - link "Payment Methods" [ref=e944] [cursor=pointer]:
                  - /url: https://www.makera.com/pages/payment-methods
              - listitem [ref=e945]:
                - link "Warranty Policy" [ref=e946] [cursor=pointer]:
                  - /url: /pages/warranty
              - listitem [ref=e947]:
                - link "Cookie Policy" [ref=e948] [cursor=pointer]:
                  - /url: /pages/cookie-policy
          - group [ref=e949]:
            - generic "Contact MAKERA":
              - generic: Contact MAKERA
            - generic [ref=e951]:
              - paragraph [ref=e952]:
                - 'link "General Inquiry: info@makera.com" [ref=e953] [cursor=pointer]':
                  - /url: mailto:info@makera.com
              - paragraph [ref=e954]:
                - 'link "Order Inquiry: orders@makera.com" [ref=e955] [cursor=pointer]':
                  - /url: mailto:orders@makera.com
              - paragraph [ref=e956]:
                - 'link "Technical Support: support@makera.com" [ref=e957] [cursor=pointer]':
                  - /url: mailto:support@makera.com
              - paragraph [ref=e958]:
                - 'link "MakeraCAM Support: cam@makera.com" [ref=e959] [cursor=pointer]':
                  - /url: mailto:cam@makera.com
          - group [ref=e960]:
            - generic "Company Info":
              - generic: Company Info
            - generic [ref=e961]:
              - paragraph [ref=e962]:
                - text: MAKERA US INC
                - text: 5900 BALCONES DRIVE STE 100
                - text: AUSTIN, Texas, 78731, US
              - paragraph [ref=e963]: "Phone: +1 (888) 456-5472"
              - paragraph [ref=e964]: "Phone Hours: Mon–Fri, 9:00 AM – 6:00 PM（EDT）"
      - generic [ref=e968]:
        - generic [ref=e969]:
          - list [ref=e971]:
            - listitem [ref=e972]:
              - link "Facebook" [ref=e973] [cursor=pointer]:
                - /url: https://www.facebook.com/MakeraGlobal/
                - img [ref=e974]
                - generic [ref=e976]: Facebook
            - listitem [ref=e977]:
              - link "X (Twitter)" [ref=e978] [cursor=pointer]:
                - /url: https://x.com/makera_inc
                - img [ref=e979]
                - generic [ref=e981]: X (Twitter)
            - listitem [ref=e982]:
              - link "Instagram" [ref=e983] [cursor=pointer]:
                - /url: https://www.instagram.com/makera.official
                - img [ref=e984]
                - generic [ref=e986]: Instagram
            - listitem [ref=e987]:
              - link "YouTube" [ref=e988] [cursor=pointer]:
                - /url: https://www.youtube.com/c/Makera
                - img [ref=e989]
                - generic [ref=e991]: YouTube
            - listitem [ref=e992]:
              - link "TikTok" [ref=e993] [cursor=pointer]:
                - /url: https://www.tiktok.com/@makera.official
                - img [ref=e994]
                - generic [ref=e996]: TikTok
          - text: © 2026 Makera All Rights Reserved. www.makera.com is the official US site, operated by MAKERA US INC.
        - list [ref=e998]:
          - listitem [ref=e999]:
            - img "Apple Pay" [ref=e1000]
          - listitem [ref=e1011]:
            - img "Diners Club" [ref=e1012]
          - listitem [ref=e1016]:
            - img "Discover" [ref=e1017]
          - listitem [ref=e1026]:
            - img "Google Pay" [ref=e1027]
          - listitem [ref=e1035]:
            - img "Mastercard" [ref=e1036]
          - listitem [ref=e1043]:
            - img "PayPal" [ref=e1044]
          - listitem [ref=e1050]:
            - img "Shop Pay" [ref=e1051]
          - listitem [ref=e1055]:
            - img "Visa" [ref=e1056]
          - listitem [ref=e1061]:
            - img "American Express" [ref=e1062]
          - listitem [ref=e1067]:
            - img "JCB" [ref=e1068]
          - listitem [ref=e1077]:
            - img "Elo" [ref=e1078]
  - text: ❯ ❯
  - button "Open chat" [ref=e1086] [cursor=pointer]:
    - img [ref=e1087]
  - region "Cookie consent"
  - generic:
    - generic:
      - generic [ref=e1092]:
        - iframe [ref=e1093]:
          - button "会社からのメッセージを閉じる" [ref=f277e3] [cursor=pointer]:
            - img [ref=f277e4]
        - iframe [ref=e1094]:
          - button "Hi. Need any help?" [ref=f278e4] [cursor=pointer]
      - iframe [ref=e1095]:
        - button "メッセージングウィンドウを開く" [ref=f279e4] [cursor=pointer]:
          - img [ref=f279e6]
          - img [ref=f279e9]
  - generic [ref=e1097]:
    - generic [ref=e1100]:
      - paragraph [ref=e1101]: Jason Erdreich
      - paragraph [ref=e1102]: Education Director of Makera
    - img [ref=e1105]
    - application [ref=e1107]:
      - paragraph [ref=e1109]: Hi? New to CNC?
    - paragraph [ref=e1113]: Start with one of these guides.
    - paragraph [ref=e1126] [cursor=pointer]: CNC Basics 101
    - paragraph [ref=e1133] [cursor=pointer]: Compare 3D Printer, Laser & CNC
    - button "Close" [ref=e1134] [cursor=pointer]:
      - img [ref=e1136]
```

# Test source

```ts
  1   | // Global 站点 — Add to cart → Check Out 结算流程冒烟测试
  2   | // 报告说明：test.step 划分步骤、allure parameter 记录运行参数、annotations 记录预期结果，
  3   | // 供 Allure 详细报告展示（步骤树/参数/预期一目了然）
  4   | import { test as base, expect, Page } from '@playwright/test';
  5   | import { parameter } from 'allure-js-commons';
  6   | import { setupPage, dismissAllPopups, addToCartViaApi, dismissCloudflareChallenge } from './helpers';
  7   | 
  8   | const TARGET_URL = 'https://global.makera.com/products/makera-z1-desktop-cnc';
  9   | // 目标商品名称（断言购物车与结算页中商品存在的基准文本；
  10  | // 实际标题为 "Makera Z1 Desktop CNC [Pre-order]"，getByRole/getByText 默认子串匹配，
  11  | // 基准文本不含后缀可兼容购物车/结算页是否展示 [Pre-order] 的两种形态）
  12  | const PRODUCT_NAME = 'Makera Z1 Desktop CNC';
  13  | const REGION = '东京 / ja-JP / Asia/Tokyo';
  14  | 
  15  | // worker 级共享页面：两个用例使用同一个浏览器页面，
  16  | // 使"商品正常进入结算页"能在"商品加入购物车"成功后的现场状态上直接继续
  17  | const test = base.extend<{}, { sharedPage: Page }>({
  18  |   sharedPage: [async ({ browser }, use) => {
  19  |     const context = await browser.newContext({
  20  |       geolocation: { longitude: 139.6917, latitude: 35.6895 },  // 东京
  21  |       locale: 'ja-JP',
  22  |       timezoneId: 'Asia/Tokyo',
  23  |       permissions: ['geolocation'],
  24  |     });
  25  |     const page = await context.newPage();
  26  |     await use(page);
  27  |     await context.close();
  28  |   }, { scope: 'worker' }],
  29  | });
  30  | 
  31  | test.describe('Global 站点', () => {
  32  | 
  33  |   // serial 模式：用例串行执行，上一用例失败时后续用例自动跳过
  34  |   //（保证"商品正常进入结算页"仅在"商品加入购物车"成功后执行）
  35  |   test.describe.configure({ mode: 'serial' });
  36  | 
  37  |   test('商品加入购物车', async ({ sharedPage: page }) => {
  38  |     // ── Allure 报告信息：运行参数 + 预期结果 ──
  39  |     parameter('TARGET_URL', TARGET_URL);
  40  |     parameter('PRODUCT_NAME', PRODUCT_NAME);
  41  |     parameter('地区/语言', REGION);
  42  |     test.info().annotations.push(
  43  |       { type: '预期结果', description: '点击 Add to cart 后购物车抽屉弹出，且抽屉内可见目标商品' },
  44  |       { type: '前置条件', description: 'setupPage 完成商店切换，页面停留在 /products/ 商品页' },
  45  |     );
  46  | 
  47  |     // ========== 阶段1：页面初始化与跳转防护 ==========
  48  |     await test.step('页面初始化与跳转防护', async () => {
  49  |       const ready = await setupPage(page, TARGET_URL);
  50  |       // setup 失败视为测试失败（触发自愈），不允许跳过
  51  |       expect(ready).toBe(true);
  52  |       // 验证 URL 包含 /products/（URL 字符串断言）
> 53  |       expect(page.url()).toContain('/products/');
      |                          ^ Error: expect(received).toContain(expected) // indexOf
  54  |     });
  55  | 
  56  |     // ========== 阶段2：等待渲染 + 弹窗清理 + 点击 Add to cart ==========
  57  |     // 定位方式：CSS 类名定位 product-form__submit（Shopify 商品表单内的真实加购按钮）
  58  |     // 页面存在多个 sticky-add-cart-btn 悬浮按钮，顶部时位于视口外，用文本定位会误匹配导致点击卡住
  59  |     const addToCartBtn = page.locator('button.product-form__submit[name="add"]').first();
  60  |     await test.step('弹窗清理并点击 Add to cart 按钮', async () => {
  61  |       console.log(`[Global] ✅ Add to cart 按钮可见，准备点击加购`);
  62  |       // 点击前等待 5s：给浮窗/懒加载元素渲染时间，便于一次性清理
  63  |       await page.waitForTimeout(5000);
  64  |       // 循环最多 3 轮：每轮先关闭全部浮窗（幸运转盘/翻译弹窗/客服悬浮/意外下拉），
  65  |       // 再滚动+点击。单次点击限时 8s，避免被遮挡时 Playwright 长时间自动滚动重试（页面上下滑动）
  66  |       for (let attempt = 1; attempt <= 3; attempt++) {
  67  |         // 先按 Escape 关闭意外展开的下拉浮窗，再清理所有已知浮窗（无论是否存在都安全执行，失败不阻断）
  68  |         await page.keyboard.press('Escape').catch(() => {});
  69  |         await page.waitForTimeout(300);
  70  |         await dismissAllPopups(page);
  71  |         try {
  72  |           // 按钮位于首屏下方，显式滚动到按钮位置后再点击（timeout 防继承测试级 300s）
  73  |           await expect(page.getByText('My Cart 0').first()).toBeVisible({ timeout: 5000 });
  74  |           await addToCartBtn.click({ timeout: 8000 });
  75  |           break;
  76  |         } catch {
  77  |           console.warn(`[Global] ⚠️ 第${attempt}轮点击失败（可能被浮窗遮挡），重新清理后重试`);
  78  |           if (attempt === 3) throw new Error('[Global] Add to cart 按钮 3 轮点击均失败');
  79  |         }
  80  |       }
  81  |       console.log(`[Global] 🛒 已点击 Add to cart，等待购物车抽屉弹出...`);
  82  |     });
  83  | 
  84  |     // ========== 阶段3：断言加购成功（抽屉弹出且目标商品存在） ==========
  85  |     await test.step('断言购物车抽屉弹出且含目标商品', async () => {
  86  |       // 定位方式：getByRole('dialog') 严格断言抽屉本体。
  87  |       // 注意：顶部导航购物车图标文本也是 "My Cart"，用 getByText(/my cart/i) 会在抽屉未弹出时误报
  88  |       const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
  89  |       // 抽屉未弹出（可能被浮窗遮挡/动画打断）时清理浮窗后重新点击加购，最多 2 轮；
  90  |       // 若页面已被导航到 Shopify /cart/add 错误页（半渲染时原生表单 POST 缺 items 参数被拒），
  91  |       // 则停止 UI 重试，改走 AJAX API 兜底加购 → 返回商品页 → 打开购物车抽屉
  92  |       for (let attempt = 1; attempt <= 2; attempt++) {
  93  |         try {
  94  |           await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  95  |           break;
  96  |         } catch {
  97  |           if (page.url().includes('/cart/add')) {
  98  |             console.warn(`[Global] ⚠️ 页面已跳转到 /cart/add 错误页，执行 AJAX API 兜底加购`);
  99  |             const added = await addToCartViaApi(page, TARGET_URL);
  100 |             expect(added).toBe(true);
  101 |             // 返回商品页恢复现场，再关闭弹窗
  102 |             await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  103 |             await dismissAllPopups(page);
  104 |             // 通过顶部购物车图标打开抽屉（同域已有购物车商品，Dawn 主题会弹出 cart-drawer）
  105 |             const cartIcon = page.locator('a[href="/cart"]').first();
  106 |             await cartIcon.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  107 |             await cartIcon.click({ timeout: 10000 }).catch(() => {});
  108 |             await page.waitForTimeout(2000);
  109 |             await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  110 |             break;
  111 |           }
  112 |           console.warn(`[Global] ⚠️ 第${attempt}轮：购物车抽屉未弹出，清理浮窗后重新点击加购`);
  113 |           if (attempt === 2) throw new Error('[Global] 加购后购物车抽屉未弹出（共点击 2 次）');
  114 |           await dismissAllPopups(page);
  115 |           await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  116 |           await addToCartBtn.click({ timeout: 8000 }).catch(() => {});
  117 |         }
  118 |       }
  119 |       console.log(`[Global] ✅ 购物车抽屉已弹出`);
  120 | 
  121 |       // 定位方式：限定在购物车抽屉（dialog）内用 getByRole 定位商品链接
  122 |       // （页面导航菜单中也存在同名隐藏文本，不限定范围会被 .first() 误匹配）
  123 |       const productInCart = cartDrawer.getByRole('link', { name: PRODUCT_NAME }).first();
  124 |       await expect(productInCart).toBeVisible({ timeout: 10000 });
  125 |       console.log(`[Global] ✅ 购物车中存在目标商品: ${PRODUCT_NAME}`);
  126 |     });
  127 |   });
  128 | 
  129 |   test('商品正常进入结算页', async ({ sharedPage: page }) => {
  130 |     // ── Allure 报告信息：运行参数 + 预期结果 ──
  131 |     parameter('TARGET_URL', TARGET_URL);
  132 |     parameter('PRODUCT_NAME', PRODUCT_NAME);
  133 |     parameter('地区/语言', REGION);
  134 |     test.info().annotations.push(
  135 |       { type: '预期结果', description: '点击 Check out 后跳转结算页 /checkouts/，且订单摘要含目标商品' },
  136 |       { type: '前置条件', description: '上一用例已加购成功，购物车抽屉处于弹出状态（沿用页面现场）' },
  137 |     );
  138 | 
  139 |     // ========== 阶段1：前置检查（确认上一用例已加购成功） ==========
  140 |     // 严格断言 dialog 角色：顶部导航的 "My Cart" 文本会让 getByText 误报
  141 |     const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
  142 |     await test.step('前置检查：购物车抽屉处于弹出状态', async () => {
  143 |       // 本用例直接沿用上一用例的页面现场，不重新初始化、不重新加购
  144 |       await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  145 |       console.log(`[Global] ✅ 购物车抽屉已弹出，直接开始点击 Check Out`);
  146 |     });
  147 | 
  148 |     // ========== 阶段2：点击 Check out 按钮进入结算页 ==========
  149 |     await test.step('弹窗清理并点击 Check out 按钮', async () => {
  150 |       // 定位方式：限定在购物车抽屉（dialog）内匹配 "Check out"
  151 |       // （该控件在不同渲染状态下可能是 button 或 link 角色，用逗号选择器兼容两种形态）
  152 |       const checkOutBtn = cartDrawer.locator('button, a').getByText(/check\s*out/i).first();
  153 |       await expect(checkOutBtn).toBeVisible({ timeout: 10000 });
```