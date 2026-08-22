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
              - group "4 / 6" [ref=e393] [cursor=pointer]: Versitile
              - group "5 / 6" [ref=e394] [cursor=pointer]: Clean
              - group "6 / 6" [ref=e395] [cursor=pointer]: Quiet
            - paragraph [ref=e397]:
              - text: Laser engraving is a unique and amazing technology that lets you leave your mark and draw beautiful patterns on your product. With the integrated laser module, you can engrave a wide variety of materials including paper, wood, plastic, leather, fabric, etc.
              - text: One more axis, much more possibilities, with the 4th axis module, you can machine cylindrical items, double sided objects, and 3D shapes on any materials, plastic, wood, even metal.
        - heading "Why Makera?" [level=2] [ref=e399]
      - generic [ref=e402]:
        - img [ref=e406]
        - generic [ref=e407]:
          - generic [ref=e408]:
            - heading "Amazingly Simple CAM Software" [level=2] [ref=e409]:
              - paragraph [ref=e410]: Amazingly Simple
              - paragraph [ref=e411]: CAM Software
            - paragraph [ref=e413]: Makera CAM
            - paragraph [ref=e415]:
              - text: A powerful yet easy-to-use CAM software that supports a variety of path types, unleashing the full potential of your Carvera and Carvera Air.
              - link "Learn More" [ref=e416] [cursor=pointer]:
                - /url: /pages/makera-cam
          - region [ref=e417]:
            - generic [ref=e418]:
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
      - generic [ref=e421]:
        - heading "Aw rds & Reviews" [level=2] [ref=e423]:
          - generic [ref=e424]: Aw
          - generic [ref=e425]: rds & Reviews
        - generic [ref=e426]:
          - generic [ref=e427]:
            - generic [ref=e428]:
              - group "4 / 5" [ref=e429]:
                - img [ref=e431]
                - paragraph [ref=e434]: Makera Z1 delivers industrial-grade performance in a compact form factor while still offering significant precision
              - group "5 / 5" [ref=e435]:
                - img [ref=e437]
                - paragraph [ref=e440]: Carvera is a desktop CNC mill with a bunch of features that seem to make it perfect for PCB prototyping.
              - group "1 / 5" [ref=e441]:
                - img [ref=e443]
                - paragraph [ref=e446]: Accessibility to CNC machining is transforming, and the Makera Carvera series is on the front line of the revolution.
              - group "2 / 5" [ref=e447]:
                - img [ref=e449]
                - paragraph [ref=e452]: For many users, the Z1 delivers an uncommon balance of industrial-grade precision and truly intuitive usability.
              - group "3 / 5" [ref=e453]:
                - img [ref=e455]
                - paragraph [ref=e458]: As a leader in intelligent desktop CNC technology, Makera is lowering the barriers to creation through innovation and user-centric design, empowering more people to turn their ideas into reality with the help of technology.
              - group "4 / 5" [ref=e459]:
                - img [ref=e461]
                - paragraph [ref=e464]: Makera Z1 delivers industrial-grade performance in a compact form factor while still offering significant precision
              - group "5 / 5" [ref=e465]:
                - img [ref=e467]
                - paragraph [ref=e470]: Carvera is a desktop CNC mill with a bunch of features that seem to make it perfect for PCB prototyping.
              - group "1 / 5" [ref=e471]:
                - img [ref=e473]
                - paragraph [ref=e476]: Accessibility to CNC machining is transforming, and the Makera Carvera series is on the front line of the revolution.
              - group "2 / 5" [ref=e477]:
                - img [ref=e479]
                - paragraph [ref=e482]: For many users, the Z1 delivers an uncommon balance of industrial-grade precision and truly intuitive usability.
            - generic [ref=e483]:
              - button "Go to slide 1" [ref=e484] [cursor=pointer]
              - button "Go to slide 2" [ref=e485] [cursor=pointer]
              - button "Go to slide 3" [ref=e486] [cursor=pointer]
              - button "Go to slide 4" [ref=e487] [cursor=pointer]
              - button "Go to slide 5" [ref=e488] [cursor=pointer]
          - img [ref=e490]
      - generic [ref=e493]:
        - generic [ref=e494]:
          - heading "What Experts Say About Makera" [level=3] [ref=e496]:
            - text: What
            - emphasis [ref=e497]: Experts Say
            - text: About Makera
          - generic [ref=e499]:
            - img [ref=e501] [cursor=pointer]
            - img [ref=e505] [cursor=pointer]
        - generic [ref=e511]:
          - generic [ref=e513]:
            - generic [ref=e515] [cursor=pointer]:
              - img [ref=e516]
              - iframe [ref=e578]:
                - generic [active] [ref=f386e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f386e3]
                  - generic [ref=f386e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f386e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f386e12] [cursor=pointer]
                        - generic [ref=f386e14]:
                          - generic [ref=f386e19]:
                            - generic [ref=f386e20]:
                              - link "BambuLab of CNC Milling? Makera Carvera Air Desktop Mill Reviewed" [ref=f386e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=WR7ROCYbwcc
                              - link "My Tech Fun" [ref=f386e22] [cursor=pointer]:
                                - /url: /channel/UC6QckhILSqdl3K0TWPWrDdg
                                - generic [ref=f386e23]: My Tech Fun
                            - generic [ref=f386e24]:
                              - button [ref=f386e25] [cursor=pointer]
                              - generic [ref=f386e27]:
                                - generic: My Tech Fun
                                - generic: チャンネル登録者数 9.19万人
                          - generic [ref=f386e28]:
                            - button "共有" [ref=f386e31] [cursor=pointer]:
                              - generic [ref=f386e35]:
                                - img
                            - link "YouTube で見る" [ref=f386e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=WR7ROCYbwcc
                              - generic [ref=f386e45]:
                                - text: 見る
                                - img [ref=f386e47]:
                                  - generic [ref=f386e49]:
                                    - img
            - generic [ref=e579]:
              - generic [ref=e580]:
                - img [ref=e582]
                - paragraph [ref=e584]: My Tech Fun
              - paragraph [ref=e586]: Extremely good hardware with the following things around it, the software controller and CAM software，materials, tools, profile for those tools and materials in the CAM software. Huge advantage of this product is the CAM software.
          - generic [ref=e588]:
            - generic [ref=e590] [cursor=pointer]:
              - img [ref=e591]
              - iframe [ref=e653]:
                - generic [active] [ref=f388e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f388e3]
                  - generic [ref=f388e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f388e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f388e12] [cursor=pointer]
                        - generic [ref=f388e14]:
                          - generic [ref=f388e19]:
                            - generic [ref=f388e20]:
                              - link "How I Made My Own iPhone from a Block of Aluminum" [ref=f388e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=Yrl4OmS3bBA
                              - link "Strange Parts" [ref=f388e22] [cursor=pointer]:
                                - /url: /channel/UCO8DQrSp5yEP937qNqTooOw
                                - generic [ref=f388e23]: Strange Parts
                            - generic [ref=f388e24]:
                              - button [ref=f388e25] [cursor=pointer]
                              - generic [ref=f388e27]:
                                - generic: Strange Parts
                                - generic: チャンネル登録者数 196万人
                          - generic [ref=f388e28]:
                            - button "共有" [ref=f388e31] [cursor=pointer]:
                              - generic [ref=f388e35]:
                                - img
                            - link "YouTube で見る" [ref=f388e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=Yrl4OmS3bBA
                              - generic [ref=f388e45]:
                                - text: 見る
                                - img [ref=f388e47]:
                                  - generic [ref=f388e49]:
                                    - img
            - generic [ref=e654]:
              - generic [ref=e655]:
                - img [ref=e657]
                - paragraph [ref=e659]:
                  - strong [ref=e660]: Strange Parts
              - paragraph [ref=e662]: It's a desktop mill designed for makers to work right out of the box, with features you'd expect on much larger more expensive machines. It includes a 6-position automatic tool changer, so you don't have to change the tool AKA the bits yourself, which is huge time saver on complex projects.
          - generic [ref=e664]:
            - generic [ref=e666] [cursor=pointer]:
              - img [ref=e667]
              - iframe [ref=e729]:
                - generic [active] [ref=f390e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f390e3]
                  - generic [ref=f390e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f390e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f390e12] [cursor=pointer]
                        - generic [ref=f390e14]:
                          - generic [ref=f390e19]:
                            - generic [ref=f390e20]:
                              - link "The BEST 4 Axis Desktop CNC Machine?" [ref=f390e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=ffZlPlssL-s
                              - link "TAOW" [ref=f390e22] [cursor=pointer]:
                                - /url: /channel/UCpV7D0LoRbYhdx2G-whWyog
                                - generic [ref=f390e23]: TAOW
                            - generic [ref=f390e24]:
                              - button [ref=f390e25] [cursor=pointer]
                              - generic [ref=f390e27]:
                                - generic: TAOW
                                - generic: チャンネル登録者数 26.4万人
                          - generic [ref=f390e28]:
                            - button "共有" [ref=f390e31] [cursor=pointer]:
                              - generic [ref=f390e35]:
                                - img
                            - link "YouTube で見る" [ref=f390e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=ffZlPlssL-s
                              - generic [ref=f390e45]:
                                - text: 見る
                                - img [ref=f390e47]:
                                  - generic [ref=f390e49]:
                                    - img
            - generic [ref=e730]:
              - generic [ref=e731]:
                - img [ref=e733]
                - paragraph [ref=e735]:
                  - strong [ref=e736]: TAOW
              - paragraph [ref=e738]: "\"The automatic tool changer, wireless touch probe and 4th axis seamlessly bring an incredible amount of automation to the Carvera CNC. Parts that used to need manual tool changes and multiple setups can now be fully automated, removing lots of manual steps and making the whole machining process more enjoyable.\""
          - generic [ref=e740]:
            - generic [ref=e742] [cursor=pointer]:
              - img [ref=e743]
              - iframe [ref=e805]:
                - generic [active] [ref=f392e1]:
                  - generic "YouTube 動画プレーヤー" [ref=f392e3]
                  - generic [ref=f392e5]:
                    - generic:
                      - generic:
                        - button "動画を再生" [ref=f392e10] [cursor=pointer]
                        - button "プレーヤー コントロールを非表示にする" [ref=f392e12] [cursor=pointer]
                        - generic [ref=f392e14]:
                          - generic [ref=f392e19]:
                            - generic [ref=f392e20]:
                              - link "Makera Carvera Auto Tool Changer Benchtop CNC machine, In-depth review, aluminum cutting stress test" [ref=f392e21] [cursor=pointer]:
                                - /url: https://www.youtube.com/watch?v=zN7eEzAqI3A
                              - link "Aurora Tech" [ref=f392e22] [cursor=pointer]:
                                - /url: /channel/UCGER4yfUXubhNVPYoNzBSEA
                                - generic [ref=f392e23]: Aurora Tech
                            - generic [ref=f392e24]:
                              - button [ref=f392e25] [cursor=pointer]
                              - generic [ref=f392e27]:
                                - generic: Aurora Tech
                                - generic: チャンネル登録者数 12.4万人
                          - generic [ref=f392e28]:
                            - button "共有" [ref=f392e31] [cursor=pointer]:
                              - generic [ref=f392e35]:
                                - img
                            - link "YouTube で見る" [ref=f392e42] [cursor=pointer]:
                              - /url: https://www.youtube.com/watch?v=zN7eEzAqI3A
                              - generic [ref=f392e45]:
                                - text: 見る
                                - img [ref=f392e47]:
                                  - generic [ref=f392e49]:
                                    - img
            - generic [ref=e806]:
              - generic [ref=e807]:
                - img [ref=e809]
                - paragraph [ref=e811]:
                  - strong [ref=e812]: AuroraTech
              - paragraph [ref=e814]: “Carvera is indeed the most advanced CNC machine I have ever used. With the Carvera CNC, I can now design parts solely based on their functionality without worrying about tool changes during the job. This eliminates the need for manual tool height adjustment and significantly reduces the risk of human errors. As a result, the success rate of CNC jobs is greatly increased.”
      - generic [ref=e817]:
        - generic [ref=e818]:
          - heading "Blog Posts" [level=2] [ref=e820]
          - generic [ref=e822]:
            - button "Previous slide" [disabled]:
              - img
            - button "Next slide" [ref=e823] [cursor=pointer]:
              - img [ref=e824]
        - generic [ref=e828]:
          - group "1 / 6" [ref=e829]
          - group "2 / 6" [ref=e830]
          - group "3 / 6" [ref=e831]
          - group "4 / 6" [ref=e832]
          - group "5 / 6" [ref=e833]
          - group "6 / 6" [ref=e834]
    - generic [ref=e835]:
      - generic [ref=e839]:
        - generic [ref=e840]:
          - img [ref=e842]
          - generic [ref=e845]:
            - paragraph [ref=e846]: 30-Day Return
            - paragraph [ref=e848]: Changed your mind? Send it back for a refund!
        - generic [ref=e849]:
          - img [ref=e851]
          - generic [ref=e854]:
            - paragraph [ref=e855]: Free Shipping
            - paragraph [ref=e857]: For orders over $100, shipped straight to your door, for Free！
        - generic [ref=e858]:
          - img [ref=e860]
          - generic [ref=e863]:
            - paragraph [ref=e864]: 1 Year Warranty
            - paragraph [ref=e866]: Manufacturer defects covered, worry free product enjoyment!
        - generic [ref=e867]:
          - img [ref=e869]
          - generic [ref=e874]:
            - paragraph [ref=e875]: 24/7 Service
            - paragraph [ref=e877]: A 24/7 online specialist is at your disposal to solve your problems.
      - contentinfo [ref=e880]:
        - generic [ref=e882]:
          - paragraph [ref=e884]: Be the first to receive our latest product updates, newest offerings, and free product trials.
          - generic [ref=e885]:
            - generic [ref=e887]:
              - textbox "Email" [ref=e888]
              - generic: Email
              - button "Subscribe" [ref=e890] [cursor=pointer]:
                - generic: Sign Up
            - paragraph [ref=e892]:
              - text: By signing up, you agree to Makera’s
              - link "Privacy Policy" [ref=e893] [cursor=pointer]:
                - /url: /
              - text: and
              - link "Terms of use" [ref=e894] [cursor=pointer]:
                - /url: /
              - text: .
        - generic [ref=e896]:
          - group [ref=e897]:
            - generic "Support":
              - generic: Support
            - list [ref=e899]:
              - listitem [ref=e900]:
                - link "Support" [ref=e901] [cursor=pointer]:
                  - /url: /pages/all-support
              - listitem [ref=e902]:
                - link "FAQ" [ref=e903] [cursor=pointer]:
                  - /url: /pages/faq
              - listitem [ref=e904]:
                - link "Track My Order" [ref=e905] [cursor=pointer]:
                  - /url: https://www.makera.com/apps/trackmyorder
              - listitem [ref=e906]:
                - link "Student & Teacher Discounts" [ref=e907] [cursor=pointer]:
                  - /url: https://www.makera.com/pages/student-discount
              - listitem [ref=e908]:
                - link "Contact Us" [ref=e909] [cursor=pointer]:
                  - /url: /pages/contact
              - listitem [ref=e910]:
                - link "Manual & Examples" [ref=e911] [cursor=pointer]:
                  - /url: /pages/carvera-manual-examples
              - listitem [ref=e912]:
                - link "Official Wiki" [ref=e913] [cursor=pointer]:
                  - /url: https://wiki.makera.com/
              - listitem [ref=e914]:
                - link "About Us" [ref=e915] [cursor=pointer]:
                  - /url: /pages/about-us
          - group [ref=e916]:
            - generic "Community":
              - generic: Community
            - list [ref=e918]:
              - listitem [ref=e919]:
                - link "Facebook Carvera Group" [ref=e920] [cursor=pointer]:
                  - /url: https://www.facebook.com/groups/carvera
              - listitem [ref=e921]:
                - link "Facebook Carvera Air Group" [ref=e922] [cursor=pointer]:
                  - /url: https://www.facebook.com/groups/carveraair/
              - listitem [ref=e923]:
                - link "YouTube Channel" [ref=e924] [cursor=pointer]:
                  - /url: https://www.youtube.com/c/Makera
              - listitem [ref=e925]:
                - link "Discord Group" [ref=e926] [cursor=pointer]:
                  - /url: https://discord.com/invite/NQ5r9jGNXV
              - listitem [ref=e927]:
                - link "Loyalty Program" [ref=e928] [cursor=pointer]:
                  - /url: https://www.makera.com/pages/points-page
              - listitem [ref=e929]:
                - link "Affiliate Program" [ref=e930] [cursor=pointer]:
                  - /url: /pages/affiliate-page
          - group [ref=e931]:
            - generic "Policy":
              - generic: Policy
            - list [ref=e933]:
              - listitem [ref=e934]:
                - link "Terms of Service" [ref=e935] [cursor=pointer]:
                  - /url: /policies/terms-of-service
              - listitem [ref=e936]:
                - link "Privacy Policy" [ref=e937] [cursor=pointer]:
                  - /url: /policies/privacy-policy
              - listitem [ref=e938]:
                - link "Shipping Policy" [ref=e939] [cursor=pointer]:
                  - /url: /policies/shipping-policy
              - listitem [ref=e940]:
                - link "Refund & Return Policy" [ref=e941] [cursor=pointer]:
                  - /url: /policies/refund-policy
              - listitem [ref=e942]:
                - link "Payment Methods" [ref=e943] [cursor=pointer]:
                  - /url: https://www.makera.com/pages/payment-methods
              - listitem [ref=e944]:
                - link "Warranty Policy" [ref=e945] [cursor=pointer]:
                  - /url: /pages/warranty
              - listitem [ref=e946]:
                - link "Cookie Policy" [ref=e947] [cursor=pointer]:
                  - /url: /pages/cookie-policy
          - group [ref=e948]:
            - generic "Contact MAKERA":
              - generic: Contact MAKERA
            - generic [ref=e950]:
              - paragraph [ref=e951]:
                - 'link "General Inquiry: info@makera.com" [ref=e952] [cursor=pointer]':
                  - /url: mailto:info@makera.com
              - paragraph [ref=e953]:
                - 'link "Order Inquiry: orders@makera.com" [ref=e954] [cursor=pointer]':
                  - /url: mailto:orders@makera.com
              - paragraph [ref=e955]:
                - 'link "Technical Support: support@makera.com" [ref=e956] [cursor=pointer]':
                  - /url: mailto:support@makera.com
              - paragraph [ref=e957]:
                - 'link "MakeraCAM Support: cam@makera.com" [ref=e958] [cursor=pointer]':
                  - /url: mailto:cam@makera.com
          - group [ref=e959]:
            - generic "Company Info":
              - generic: Company Info
            - generic [ref=e960]:
              - paragraph [ref=e961]:
                - text: MAKERA US INC
                - text: 5900 BALCONES DRIVE STE 100
                - text: AUSTIN, Texas, 78731, US
              - paragraph [ref=e962]: "Phone: +1 (888) 456-5472"
              - paragraph [ref=e963]: "Phone Hours: Mon–Fri, 9:00 AM – 6:00 PM（EDT）"
      - generic [ref=e967]:
        - generic [ref=e968]:
          - list [ref=e970]:
            - listitem [ref=e971]:
              - link "Facebook" [ref=e972] [cursor=pointer]:
                - /url: https://www.facebook.com/MakeraGlobal/
                - img [ref=e973]
                - generic [ref=e975]: Facebook
            - listitem [ref=e976]:
              - link "X (Twitter)" [ref=e977] [cursor=pointer]:
                - /url: https://x.com/makera_inc
                - img [ref=e978]
                - generic [ref=e980]: X (Twitter)
            - listitem [ref=e981]:
              - link "Instagram" [ref=e982] [cursor=pointer]:
                - /url: https://www.instagram.com/makera.official
                - img [ref=e983]
                - generic [ref=e985]: Instagram
            - listitem [ref=e986]:
              - link "YouTube" [ref=e987] [cursor=pointer]:
                - /url: https://www.youtube.com/c/Makera
                - img [ref=e988]
                - generic [ref=e990]: YouTube
            - listitem [ref=e991]:
              - link "TikTok" [ref=e992] [cursor=pointer]:
                - /url: https://www.tiktok.com/@makera.official
                - img [ref=e993]
                - generic [ref=e995]: TikTok
          - text: © 2026 Makera All Rights Reserved. www.makera.com is the official US site, operated by MAKERA US INC.
        - list [ref=e997]:
          - listitem [ref=e998]:
            - img "Apple Pay" [ref=e999]
          - listitem [ref=e1010]:
            - img "Diners Club" [ref=e1011]
          - listitem [ref=e1015]:
            - img "Discover" [ref=e1016]
          - listitem [ref=e1025]:
            - img "Google Pay" [ref=e1026]
          - listitem [ref=e1034]:
            - img "Mastercard" [ref=e1035]
          - listitem [ref=e1042]:
            - img "PayPal" [ref=e1043]
          - listitem [ref=e1049]:
            - img "Shop Pay" [ref=e1050]
          - listitem [ref=e1054]:
            - img "Visa" [ref=e1055]
          - listitem [ref=e1060]:
            - img "American Express" [ref=e1061]
          - listitem [ref=e1066]:
            - img "JCB" [ref=e1067]
          - listitem [ref=e1076]:
            - img "Elo" [ref=e1077]
  - text: ❯ ❯
  - button "Open chat" [ref=e1085] [cursor=pointer]:
    - img [ref=e1086]
  - region "Cookie consent"
  - generic:
    - generic:
      - generic [ref=e1091]:
        - iframe [ref=e1092]:
          - button "会社からのメッセージを閉じる" [ref=f396e3] [cursor=pointer]:
            - img [ref=f396e4]
        - iframe [ref=e1093]:
          - button "Hi. Need any help?" [ref=f397e4] [cursor=pointer]
      - iframe [ref=e1094]:
        - button "メッセージングウィンドウを開く" [ref=f398e4] [cursor=pointer]:
          - img [ref=f398e6]
          - img [ref=f398e9]
  - generic [ref=e1096]:
    - generic [ref=e1099]:
      - paragraph [ref=e1100]: Jason Erdreich
      - paragraph [ref=e1101]: Education Director of Makera
    - img [ref=e1104]
    - application [ref=e1106]:
      - paragraph [ref=e1108]: Hi? New to CNC?
    - paragraph [ref=e1112]: Start with one of these guides.
    - paragraph [ref=e1125] [cursor=pointer]: CNC Basics 101
    - paragraph [ref=e1132] [cursor=pointer]: Compare 3D Printer, Laser & CNC
    - button "Close" [ref=e1133] [cursor=pointer]:
      - img [ref=e1135]
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
  73  |           await addToCartBtn.click({ timeout: 8000 });
  74  |           break;
  75  |         } catch {
  76  |           console.warn(`[Global] ⚠️ 第${attempt}轮点击失败（可能被浮窗遮挡），重新清理后重试`);
  77  |           if (attempt === 3) throw new Error('[Global] Add to cart 按钮 3 轮点击均失败');
  78  |         }
  79  |       }
  80  |       console.log(`[Global] 🛒 已点击 Add to cart，等待购物车抽屉弹出...`);
  81  |     });
  82  | 
  83  |     // ========== 阶段3：断言加购成功（抽屉弹出且目标商品存在） ==========
  84  |     await test.step('断言购物车抽屉弹出且含目标商品', async () => {
  85  |       // 定位方式：getByRole('dialog') 严格断言抽屉本体。
  86  |       // 注意：顶部导航购物车图标文本也是 "My Cart"，用 getByText(/my cart/i) 会在抽屉未弹出时误报
  87  |       const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
  88  |       // 抽屉未弹出（可能被浮窗遮挡/动画打断）时清理浮窗后重新点击加购，最多 2 轮；
  89  |       // 若页面已被导航到 Shopify /cart/add 错误页（半渲染时原生表单 POST 缺 items 参数被拒），
  90  |       // 则停止 UI 重试，改走 AJAX API 兜底加购 → 返回商品页 → 打开购物车抽屉
  91  |       for (let attempt = 1; attempt <= 2; attempt++) {
  92  |         try {
  93  |           await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  94  |           break;
  95  |         } catch {
  96  |           if (page.url().includes('/cart/add')) {
  97  |             console.warn(`[Global] ⚠️ 页面已跳转到 /cart/add 错误页，执行 AJAX API 兜底加购`);
  98  |             const added = await addToCartViaApi(page, TARGET_URL);
  99  |             expect(added).toBe(true);
  100 |             // 返回商品页恢复现场，再关闭弹窗
  101 |             await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  102 |             await dismissAllPopups(page);
  103 |             // 通过顶部购物车图标打开抽屉（同域已有购物车商品，Dawn 主题会弹出 cart-drawer）
  104 |             const cartIcon = page.locator('a[href="/cart"]').first();
  105 |             await expect(page.getByText('New Launch! The Makera Z1 Pre-Order Is Live.').first()).toBeVisible({ timeout: 5000 });
  106 |             await cartIcon.click({ timeout: 10000 }).catch(() => {});
  107 |             await page.waitForTimeout(2000);
  108 |             await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  109 |             break;
  110 |           }
  111 |           console.warn(`[Global] ⚠️ 第${attempt}轮：购物车抽屉未弹出，清理浮窗后重新点击加购`);
  112 |           if (attempt === 2) throw new Error('[Global] 加购后购物车抽屉未弹出（共点击 2 次）');
  113 |           await dismissAllPopups(page);
  114 |           await addToCartBtn.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  115 |           await addToCartBtn.click({ timeout: 8000 }).catch(() => {});
  116 |         }
  117 |       }
  118 |       console.log(`[Global] ✅ 购物车抽屉已弹出`);
  119 | 
  120 |       // 定位方式：限定在购物车抽屉（dialog）内用 getByRole 定位商品链接
  121 |       // （页面导航菜单中也存在同名隐藏文本，不限定范围会被 .first() 误匹配）
  122 |       const productInCart = cartDrawer.getByRole('link', { name: PRODUCT_NAME }).first();
  123 |       await expect(productInCart).toBeVisible({ timeout: 10000 });
  124 |       console.log(`[Global] ✅ 购物车中存在目标商品: ${PRODUCT_NAME}`);
  125 |     });
  126 |   });
  127 | 
  128 |   test('商品正常进入结算页', async ({ sharedPage: page }) => {
  129 |     // ── Allure 报告信息：运行参数 + 预期结果 ──
  130 |     parameter('TARGET_URL', TARGET_URL);
  131 |     parameter('PRODUCT_NAME', PRODUCT_NAME);
  132 |     parameter('地区/语言', REGION);
  133 |     test.info().annotations.push(
  134 |       { type: '预期结果', description: '点击 Check out 后跳转结算页 /checkouts/，且订单摘要含目标商品' },
  135 |       { type: '前置条件', description: '上一用例已加购成功，购物车抽屉处于弹出状态（沿用页面现场）' },
  136 |     );
  137 | 
  138 |     // ========== 阶段1：前置检查（确认上一用例已加购成功） ==========
  139 |     // 严格断言 dialog 角色：顶部导航的 "My Cart" 文本会让 getByText 误报
  140 |     const cartDrawer = page.getByRole('dialog', { name: /my cart/i }).first();
  141 |     await test.step('前置检查：购物车抽屉处于弹出状态', async () => {
  142 |       // 本用例直接沿用上一用例的页面现场，不重新初始化、不重新加购
  143 |       await expect(cartDrawer).toBeVisible({ timeout: 15000 });
  144 |       console.log(`[Global] ✅ 购物车抽屉已弹出，直接开始点击 Check Out`);
  145 |     });
  146 | 
  147 |     // ========== 阶段2：点击 Check out 按钮进入结算页 ==========
  148 |     await test.step('弹窗清理并点击 Check out 按钮', async () => {
  149 |       // 定位方式：限定在购物车抽屉（dialog）内匹配 "Check out"
  150 |       // （该控件在不同渲染状态下可能是 button 或 link 角色，用逗号选择器兼容两种形态）
  151 |       const checkOutBtn = cartDrawer.locator('button, a').getByText(/check\s*out/i).first();
  152 |       await expect(checkOutBtn).toBeVisible({ timeout: 10000 });
  153 |       console.log(`[Global] ✅ Check Out 按钮可见，准备进入结算页`);
```