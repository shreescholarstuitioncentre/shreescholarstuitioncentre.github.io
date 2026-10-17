import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, math, os
os.makedirs('figs',exist_ok=True)
C='#1a3d7c'; R='#b03030'
S3=math.sqrt(3)
class F:
    def __init__(s,name,xl,yl,w=3.8,h=2.6):
        s.name=name; s.fig,s.ax=plt.subplots(figsize=(w,h),dpi=170); s.ax.set_xlim(*xl); s.ax.set_ylim(*yl)
        s.ax.set_aspect('equal'); s.ax.axis('off'); s.xl=xl
        s.ax.plot(xl,[0,0],color='#555',lw=1.4)
    def L(s,p,q,c=C,ls='-',lw=1.5): s.ax.plot([p[0],q[0]],[p[1],q[1]],color=c,ls=ls,lw=lw)
    def T(s,x,y,t,fs=9,ha='center',va='center',c='k'): s.ax.text(x,y,t,fontsize=fs,ha=ha,va=va,color=c)
    def arc(s,c,r,t1,t2,lab,lr=None):
        import numpy as np
        a=np.radians(np.linspace(t1,t2,30)); s.ax.plot(c[0]+r*np.cos(a),c[1]+r*np.sin(a),color=R,lw=1)
        m=math.radians((t1+t2)/2); lr=lr or r*1.55
        s.T(c[0]+lr*math.cos(m),c[1]+lr*math.sin(m),lab,fs=8,c=R)
    def pt(s,x,y,n,dx=0,dy=-0.06,fs=9):
        s.ax.plot([x],[y],'o',color='k',ms=3); s.T(x+dx,y+dy,n,fs=fs)
    def save(s):
        s.fig.savefig('figs/%s.png'%s.name,bbox_inches='tight',pad_inches=0.05); plt.close(s.fig)
def depress(name,H,h,d,a_top,a_foot,lab_top,lab_foot,Hl,hl,dl,names=('A','B','C')):
    """tall building (left) of height H; shorter object (right) height h at distance d.
    angles of depression a_top (to top of short), a_foot (to its foot)."""
    f=F(name,(-0.2*d,1.3*d),(-0.12*H,1.15*H))
    f.L((0,0),(0,H),lw=2.5); f.L((d,0),(d,h),lw=2.5)
    f.L((0,H),(d,0),ls='-'); f.L((0,H),(d,h),ls='-'); f.L((0,H),(1.25*d,H),c='#777',ls='--',lw=1); f.L((0,h),(d,h),c='#777',ls=':',lw=1)
    f.arc((0,H),0.28*d,-a_foot,0,lab_foot,0.42*d); f.arc((0,H),0.5*d,-a_top,0,lab_top,0.63*d) if False else None
    f.arc((0,H),0.45*d,-a_top,0,lab_top,0.6*d)
    f.T(-0.08*d,H/2,Hl,ha='right'); f.T(d+0.05*d,h/2,hl,ha='left'); f.T(d/2,-0.07*H,dl,va='top')
    f.save()
def two_poles(name,W,x,h,a1,a2,Wl):
    f=F(name,(-0.15*W,1.15*W),(-0.2*h,1.45*h))
    f.L((0,0),(0,h),lw=2.5); f.L((W,0),(W,h),lw=2.5); f.L((x,0),(0,h)); f.L((x,0),(W,h))
    f.arc((x,0),0.1*W,180-a1,180,'%d°'%a1,0.14*W) if False else None
    f.arc((x,0),0.09*W,180-a1,180,'%d°'%a1,0.13*W); f.arc((x,0),0.09*W,0,a2,'%d°'%a2,0.13*W)
    f.pt(x,0,'P',dy=-0.12*h); f.T(-0.04*W,h/2,'h',ha='right'); f.T(W+0.04*W,h/2,'h',ha='left'); f.T(W/2,-0.12*h,Wl,va='top'); f.save()
def shadow(name,h,s1,s2,l1,l2,gap):
    f=F(name,(-0.2*s2,1.25*s2),(-0.18*h,1.3*h))
    f.L((0,0),(0,h),lw=2.5); f.L((0,h),(s1,0)); f.L((0,h),(s2,0))
    f.arc((s1,0),0.13*s2,180-math.degrees(math.atan2(h,s1)),180,l1,0.22*s2); f.arc((s2,0),0.13*s2,180-math.degrees(math.atan2(h,s2)),180,l2,0.22*s2)
    f.T(-0.04*s2,h/2,'h',ha='right'); f.T((s1+s2)/2,-0.12*h,gap,va='top'); f.save()
# ---- individual scenes ----
f=F('flag',(-4,22),(-3,20)); f.L((17.32,0),(17.32,17.32),lw=2.5); f.L((17.32,10),(19.3,10),lw=2.5)
f.L((0,0),(17.32,10)); f.L((0,0),(17.32,17.32)); f.arc((0,0),4.5,0,30,'30°',6.2); f.arc((0,0),2.6,30,45,'45°',3.6)
f.pt(0,0,'P',dy=-1.2); f.T(15.8,5,'10 m',ha='right'); f.T(19.0,13.6,'flag',ha='left'); f.T(8.6,-1.2,'d',va='top'); f.save()
f=F('lighthouse',(-20,140),(-12,90)); f.L((0,0),(0,68.3),lw=2.5); f.L((0,68.3),(68.3,0)); f.L((0,68.3),(118.3,0)); f.L((0,68.3),(140,68.3),c='#777',ls='--',lw=1)
f.arc((0,68.3),22,-45,0,'45°',30); f.arc((0,68.3),44,-30,0,'30°',54)
f.pt(68.3,0,'B',dy=-6); f.pt(118.3,0,'A',dy=-6); f.T(-4,34,'h',ha='right'); f.T(93,-6,'50 m',va='top'); f.T(0,-6,'S',va='top'); f.save()
f=F('shiphill',(-6,34),(-4,60)); f.L((0,0),(0,14),lw=3); f.L((24.25,0),(24.25,56),lw=2.5); f.L((0,14),(24.25,0)); f.L((0,14),(24.25,56)); f.L((0,14),(30,14),c='#777',ls='--',lw=1)
f.arc((0,14),9,-30,0,'30°',12.5); f.arc((0,14),7,0,60,'60°',9.5); f.T(-1,7,'14 m',ha='right'); f.T(26,32,'hill',ha='left'); f.T(12,-3,'d',va='top'); f.save()
f=F('bird',(-90,150),(-12,100)); f.L((0,0),(0,80),lw=2.5); f.L((-80,0),(0,80)); f.L((-80,0),(138.56,80)); f.L((0,80),(138.56,80),c=R,ls='--')
f.arc((-80,0),20,0,45,'45°',27); f.arc((-80,0),38,0,30,'30°',46); f.pt(-80,0,'P',dy=-7); f.T(-4,40,'80 m',ha='right'); f.T(0,86,'A',fs=9); f.T(138.56,86,'B'); f.T(70,86,'flies',c=R,fs=8); f.save()
f=F('temple',(-6,26),(-3,30)); f.L((0,0),(0,15),lw=2.5); f.L((15,0),(15,23.66),lw=2.5); f.L((0,15),(15,0)); f.L((0,15),(15,23.66)); f.L((0,15),(20,15),c='#777',ls='--',lw=1)
f.arc((0,15),5,-45,0,'45°',7.2); f.arc((0,15),7.5,0,30,'30°',9.8); f.T(-1,7.5,'15 m',ha='right'); f.T(16.4,12,'h',ha='left'); f.T(7.5,-1.5,'15 m',va='top'); f.save()
f=F('towerbldg',(-5,24),(-4,46)); f.L((0,0),(0,14.64),lw=2.5); f.L((14.64,0),(14.64,40),lw=2.5); f.L((0,14.64),(14.64,0)); f.L((0,14.64),(14.64,40)); f.L((0,14.64),(20,14.64),c='#777',ls='--',lw=1)
f.arc((0,14.64),5,-45,0,'45°',7); f.arc((0,14.64),7.5,0,60,'60°',10); f.T(-1,7,'building',ha='right',fs=8); f.T(15.8,22,'tower 40 m',ha='left',fs=8); f.save()
f=F('tree',(-3,12),(-2,9)); f.L((0,0),(0,4.62),lw=2.5); f.L((0,4.62),(8,0),c=R,lw=2); f.T(-0.4,2.3,'8/√3',ha='right',fs=8); f.T(4,-0.7,'8 m',va='top'); f.arc((8,0),1.6,150,180,'30°',2.4); f.pt(0,4.62,'B',dx=-0.4,dy=0.4); f.pt(8,0,'C',dy=-0.5); f.save()
f=F('cable',(-5,26),(-4,26)); f.L((0,0),(0,7),lw=2.5); f.L((13.1,0),(13.1,19.12),lw=2.5) if False else None
f.L((7,0),(7,19.12),lw=2.5); f.L((0,7),(7,0)); f.L((0,7),(7,19.12)); f.L((0,7),(14,7),c='#777',ls='--',lw=1)
f.arc((0,7),3.5,-45,0,'45°',5); f.arc((0,7),5.5,0,60,'60°',7.4); f.T(-1,3.5,'7 m',ha='right'); f.T(8,14,'h',ha='left'); f.save()
shadow('shadow_by',43.3,25,75,'60°','30°','50 m')
shadow('shadow_gen',40,25,70,'φ','θ','a m')
f=F('catower',(-15,75),(-8,105)); f.L((0,0),(0,94.64),lw=2.5); f.L((54.64,0),(54.64,40),lw=2)
f.L((54.64,0),(0,94.64)); f.L((54.64,40),(0,94.64)); f.L((54.64,40),(0,40),c='#777',ls='--',lw=1)
f.arc((54.64,0),12,180-60,180,'60°',17); f.arc((54.64,40),12,180-45,180,'45°',17)
f.pt(54.64,0,'X',dy=-6); f.pt(54.64,40,'Y',dx=5,dy=0); f.T(-3,98,'Q'); f.T(0,-6,'P',va='top'); f.T(59,20,'40 m',ha='left'); f.save()
f=F('bridge',(-14,12),(-2,8)); f.ax.plot([-14,-8.66],[0,0],color='#2a7',lw=3);f.ax.plot([5,12],[0,0],color='#2a7',lw=3)
f.L((0,5),(0,0),c='#777',ls=':'); f.L((0,5),(-8.66,0)); f.L((0,5),(5,0)); f.L((-14,5),(12,5),c='#777',ls='--',lw=1)
f.arc((0,5),2.6,180,210,'30°',3.8); f.arc((0,5),2.6,-45,0,'45°',3.9); f.T(-7,-0.8,'A',va='top'); f.T(5,-0.8,'B',va='top'); f.T(0,5.8,'C'); f.T(0.4,2.5,'5 m',ha='left'); f.save()
f=F('towerbldg2',(-6,40),(-5,60)); f.L((0,0),(0,50),lw=2.5); f.L((28.87,0),(28.87,16.67),lw=2.5); f.L((0,0),(28.87,16.67)); f.L((28.87,0),(0,50))
f.arc((0,0),9,0,30,'30°',12); f.arc((28.87,0),9,120,180,'60°',12.5); f.T(-1,25,'50 m',ha='right'); f.T(30,8,'h',ha='left'); f.T(14,-2,'d',va='top'); f.save()
f=F('statue',(-6,5),(-0.8,5.2)); f.L((0,0),(0,2.19),lw=3); f.L((0,2.19),(0,3.79),c=R,lw=3); f.L((-2.19,0),(0,2.19)); f.L((-2.19,0),(0,3.79))
f.arc((-2.19,0),0.9,0,45,'45°',1.35); f.arc((-2.19,0),1.45,0,60,'60°',1.8) if False else f.arc((-2.19,0),1.6,45,60,'60°',2.1)
f.T(0.15,1.1,'pedestal',ha='left',fs=8); f.T(0.15,3,'statue 1.6 m',ha='left',fs=8); f.pt(-2.19,0,'P',dy=-0.4); f.save()
f=F('mcq_OAP',(-1,13),(-1,8)); f.L((0,0),(5,5)); f.L((0,0),(10,5.77)); f.L((5,0),(5,5),lw=2); f.L((10,0),(10,5.77),lw=2)
f.arc((0,0),2,0,45,'45°',2.7); f.T(0,-0.5,'O',va='top'); f.T(5,5.5,'A'); f.T(10,6.3,'P'); f.T(5,-0.5,'B',va='top'); f.T(10,-0.5,'Q',va='top'); f.arc((10,5.77),1.8,240,270,'60°',2.6); f.save()
f=F('shadow20',(-4,40),(-3,24)); f.L((0,0),(0,20),lw=2.5); f.L((0,20),(34.64,0)); f.arc((34.64,0),7,150,180,'θ',9.5); f.T(-1,10,'20 m',ha='right'); f.T(17,-1.5,'20√3 m',va='top'); f.save()
# depression scenes: name,H,h,d,a_top,a_foot,labels
depress('dep_10',23.66,10,23.66,30,45,'30°','45°','H','10 m','d')
depress('dep_8',18.93,8,18.93,30,45,'30°','45°','H','8 m','d')
depress('dep_6',9,6,5.196,30,60,'30°','60°','H','6 m','d')
depress('dep_tower60',60,25.36,34.64,45,60,'45°','60°','60 m','h','d')
depress('dep_bldg60',60,40,34.64,30,60,'30°','60°','60 m','tower h','d')
two_poles('poles80',80,20,34.64,60,30,'80 m')
two_poles('poles60',60,45,25.98,30,60,'60 m')
