# ************************************# 
# 项目功能：App去广告/小程序去广告
# 更新日期：2025-03-18
# 脚本作者：@ddm1023
# 电报频道：https://t.me/ddm1023
# 使用声明：⚠️仅供参考，🈲转载与售卖！
# ************************************# 

########## App去广告系列 ##########

# 阿里系列开屏 hostname = *.m.taobao.com
^https?:\/\/acs\.m\.taobao\.com\/gw\/mtop\.(alibaba\.advertisementservice\.getadv|alimama\.etao\.config\.query\/.+?etao_advertise|alimusic\.common\.mobileservice\.startinit|etao\.noah\.query\/.+tao_splash|film\.mtopadvertiseapi\.queryadvertise|o2o\.ad\.gateway\.get|taobao\.idle\.home\.welcome|trip\.activity\.querytmsresources) url reject-dict
^https?:\/\/guide-acs\.m\.taobao\.com\/gw\/mtop\.(cainiao\.adx\.flyad\.getad|taobao\.(volvo\.secondfloor\.getconfig|wireless\.home\.newface\.awesome\.get)) url reject-dict

# 京东金融 去除开屏广告 hostname = ms.jr.jd.com
^https?:\/\/ms\.jr\.jd\.com\/gw\/generic\/aladdin\/newna\/m\/getLoadingPicture url reject-200

# 京喜/京喜特价/京东小家 去除开屏广告 hostname = api.*.jd.com
^https?:\/\/api\..*\.jd\.com\/(client\.action\?functionId=lite_advertising|.+\/service\/getLoadingLinks) url script-response-body https://raw.githubusercontent.com/chxm1023/Advertising/main/jhad.js

# 趣听音乐馆 屏蔽弹窗–自动激活App hostname = api.bspapp.com, api.next.bspapp.com
^https?:\/\/(api|api\.next)\.bspapp\.com\/client$ url script-response-body https://raw.githubusercontent.com/chxm1023/Advertising/main/quting.js

# 瓜子影视横幅广告 hostname = api.5fcgcnn.com, api.hpdgjnf.com
^https?:\/\/api\.(5fcgcnn|hpdgjnf)\.com\/App\/Ad\/(barsIndexAdInfo|splashInfo|vajraInfo) url reject-dict

# 段咖影视-去除所有 hostname = www.duankamv.site
^https?:\/\/www\.duankamv\.site\/api\/DKswitch url script-response-body https://raw.githubusercontent.com/chxm1023/Advertising/main/Admodule.js

# 1080-看世界-去除公告弹窗显示
http:\/\/(haoa\.woaifan\.me|172\.247\.68\.76):\d+\/(aifan|xnm)\.php\/v\d\/top_notice url reject-dict

# 新剧多-xjd333.com hostname = apple.tongchengfabu.com
^https?:\/\/apple\.tongchengfabu\.com\/video url script-response-body https://raw.githubusercontent.com/chxm1023/Advertising/main/Admodule.js

# 佩奇影视-去除开屏显示/首页弹窗
http:\/\/162\.209\.166\.196:6080\/pqys\.php\/v\d\/(app_config|top_notice) url script-response-body https://raw.githubusercontent.com/chxm1023/Advertising/main/Admodule.js

# 小龙/小毛影视 hostname = api.juliangcili.com
^https:\/\/api\.juliangcili\.com\/\/api\/adver\/space\/waterFall\/list url reject-dict
http:\/\/sv\.adintl\.cn url reject

# 555影视 去除广告模块 hostname = vip7.fzwdyy.cn
^https?:\/\/vip7\.fzwdyy\.cn:8083\/api\/(getAdvertInfo|getGOOGAdvert) url reject-dict
# hostname = a.weilai555.com, app-v1.ecoliving168.com
^https?:\/\/.*\.(weilai555\.com:1000|ecoliving168\.com)\/api\/v\d\/movie\/(index_recommend.+|detail) url script-response-body https://raw.githubusercontent.com/chxm1023/Advertising/main/555ad.js

# 酷安 去好物推荐 hostname = api.coolapk.com
^https:\/\/api\.coolapk\.com\/v\d\/feed\/detail.* url script-response-body https://raw.githubusercontent.com/chxm1023/Advertising/main/KA.js
