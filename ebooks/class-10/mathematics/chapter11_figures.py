import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, numpy as np, math, os
from matplotlib.patches import Wedge, Polygon, Circle
os.makedirs('figs',exist_ok=True)
C='#1a3d7c'; R='#b03030'; FILL='#f2c14e'
class F:
    def __init__(s,name,w=3.0,h=2.8):
        s.name=name; s.fig,s.ax=plt.subplots(figsize=(w,h),dpi=170); s.ax.set_aspect('equal'); s.ax.axis('off')
    def L(s,p,q,col=C,ls='-',lw=1.5): s.ax.plot([p[0],q[0]],[p[1],q[1]],color=col,ls=ls,lw=lw)
    def T(s,p,t,dx=0,dy=0,fs=9,c='k',ha='center'): s.ax.text(p[0]+dx,p[1]+dy,t,fontsize=fs,ha=ha,va='center',color=c)
    def circ(s,c,r,col='#999',ls='-',lw=1): s.ax.add_patch(Circle(c,r,fill=False,ec=col,ls=ls,lw=lw))
    def save(s):
        s.ax.autoscale_view(); s.fig.savefig('figs/%s.png'%s.name,bbox_inches='tight',pad_inches=0.06); plt.close(s.fig)
def pol(r,a): a=math.radians(a); return (r*math.cos(a),r*math.sin(a))
def sector(name,r,ang,rl,al,major=False,arcl=None):
    f=F(name); O=(0,0); A=pol(r,0); B=pol(r,ang)
    f.circ(O,r)
    f.ax.add_patch(Wedge(O,r,(ang if major else 0),(360 if major else ang),fc=FILL,ec=C,lw=1.5,alpha=0.8)) if major else f.ax.add_patch(Wedge(O,r,0,ang,fc=FILL,ec=C,lw=1.5,alpha=0.8))
    f.L(O,A);f.L(O,B)
    for p,t,dx,dy in ((O,'O',-0.1*r,-0.12*r),(A,'A',0.1*r,-0.08*r),(B,'B',0.0,0.12*r)): f.T(p,t,dx,dy)
    m=pol(0.5*r,ang/2); f.T(pol(0.27*r,ang/2),al,fs=8,c=R)
    f.T(pol(0.62*r,-6),rl,fs=8,c=R)
    if arcl: f.T(pol(1.18*r,ang/2),arcl,fs=8,c=R)
    f.ax.set_xlim(-1.2*r,1.5*r);f.ax.set_ylim(-1.2*r,1.25*r);f.save()
def segment(name,r,ang,rl,al,minor_lbl='minor segment'):
    f=F(name); O=(0,0); A=pol(r,-ang/2); B=pol(r,ang/2)
    f.circ(O,r,col='#999'); t=np.linspace(-ang/2,ang/2,60); xs=[r*math.cos(math.radians(a)) for a in t]; ys=[r*math.sin(math.radians(a)) for a in t]
    f.ax.add_patch(Polygon(list(zip(xs,ys)),closed=True,fc=FILL,ec=C,lw=1.5,alpha=0.85))
    f.ax.add_patch(Polygon([O,A,B],closed=True,fc='#dde8f7',ec=C,lw=1.2))
    for p,t_,dx,dy in ((O,'O',-0.12*r,0),(A,'A',0.1*r,-0.12*r),(B,'B',0.1*r,0.12*r)): f.T(p,t_,dx,dy)
    f.T(pol(0.28*r,0),al,fs=8,c=R); f.T(pol(0.55*r,-ang/2+0),rl,fs=8,c=R,dx=-0.05*r,dy=-0.08*r)
    f.T((r*math.cos(math.radians(ang/2))+0.18*r,0),'segment',fs=7,c='#7a5a00',ha='left') if ang<180 else None
    f.ax.set_xlim(-1.2*r,1.7*r);f.ax.set_ylim(-1.15*r,1.15*r);f.save()
sector('sec30_14',14,30,'14 cm','30°'); sector('sec60_21',21,60,'21 cm','60°'); sector('sec30_4',4,30,'4 cm','30°')
sector('sec60_6',6,60,'6 cm','60°'); sector('sec90_7',7,90,'7 cm','90°'); sector('arc60_21',21,60,'21 cm','60°',arcl='arc')
sector('arc30_14',14,30,'14 cm','30°',arcl='arc'); sector('arc60_105',10.5,60,'10.5 cm','60°',arcl='arc'); sector('arc90_10',10,90,'10 cm','90°',arcl='arc')
sector('sec30_4_major',4,30,'4 cm','30°',major=True); sector('arcth',5,70,'r','θ',arcl='arc')
segment('seg60_21',21,60,'21','60°'); segment('seg120_14',14,120,'14','120°'); segment('seg60_14',14,60,'14','60°'); segment('seg60_20',20,60,'20','60°')
# quadrant 3.5 (RE)
f=F('re_quad'); r=3.5; O=(0,0);B=(-r,0);A=(0,r);D=(0,2)
t=np.linspace(90,180,60); pts=[(r*math.cos(math.radians(a)),r*math.sin(math.radians(a))) for a in t]
f.ax.add_patch(Polygon(pts+[O],closed=True,fc='#fff',ec=C,lw=1.5)); f.ax.add_patch(Polygon(pts+[D],closed=True,fc=FILL,ec=C,lw=1.5,alpha=0.85)) if False else None
f.ax.add_patch(Polygon([O,B,D],closed=True,fc='#dde8f7',ec=C)); f.ax.add_patch(Polygon(pts+[D,B],closed=True,fc=FILL,alpha=0.85,ec=C)) if False else None
# shaded = quadrant minus triangle BOD : polygon along arc from A to B, then B->D->A? use arc + B->D + D->A
f.ax.add_patch(Polygon(pts[::-1][::-1]+[B],closed=False,fc='none')) if False else None
shade=[A]+[p for p in pts[1:]]+[B,D]
f.ax.add_patch(Polygon(shade,closed=True,fc=FILL,ec=C,lw=1.5,alpha=0.85)); f.L(O,A);f.L(O,B);f.L(B,D)
for p,t_,dx,dy in ((O,'O',0.25,-0.2),(A,'A',0.1,0.2),(B,'B',-0.25,-0.1),(D,'D',0.25,0)): f.T(p,t_,dx,dy)
f.T((-1.7,-0.25),'3.5 cm',fs=8,c=R); f.T((0.35,1),'2 cm',fs=8,c=R); f.ax.set_xlim(-4.2,0.9);f.ax.set_ylim(-0.6,4);f.save()
# AY shaded: circle diameter RQ, P on circle
f=F('ay_shade'); r=12.5; O=(0,0); R_=(-r*math.cos(math.radians(16.26)),-r*math.sin(math.radians(16.26)))
Rp=(-7*1.0,0);
import numpy as np
# place RQ as a tilted diameter: use angles
aR=200; aQ=20; Rr=pol(r,aR); Q=pol(r,aQ)
# P with PQ=24, PR=7: angle at R... P = point on circle: compute using chord PR=7 -> central angle
cen=2*math.degrees(math.asin(7/(2*r))); aP=aR+cen; P=pol(r,aP)
f.circ(O,r,col='#999')
arc=[pol(r,a) for a in np.linspace(aQ,aR,2)]
semi=[pol(r,a) for a in np.linspace(aR,aR+180,80)]
f.ax.add_patch(Polygon(semi,closed=True,fc=FILL,ec=C,alpha=0.85)); f.ax.add_patch(Polygon([Rr,P,Q],closed=True,fc='white',ec=C,lw=1.5))
f.L(Rr,Q,ls='--'); 
for p,t_,dx,dy in ((O,'O',0.8,1.8),(Rr,'R',-1.4,0.6),(Q,'Q',1.2,0.8),(P,'P',0.8,-1.2)): f.T(p,t_,dx,dy)
f.T(((P[0]+Q[0])/2+1.5,(P[1]+Q[1])/2-1),'24 cm',fs=8,c=R); f.T(((P[0]+Rr[0])/2,(P[1]+Rr[1])/2-1.8),'7 cm',fs=8,c=R); f.save()
# square in circle
f=F('sqcirc'); r=4; f.circ((0,0),r,col=C,lw=1.5); s_=r/math.sqrt(2)
f.ax.add_patch(Polygon([(s_,s_),(-s_,s_),(-s_,-s_),(s_,-s_)],closed=True,fc=FILL,ec=C,lw=1.5,alpha=0.85)); f.L((s_,s_),(-s_,-s_),ls='--',col='#777');f.T((0.4,0.4),'8 cm',fs=8,c=R,dx=0.7,dy=0.2); f.T((0,-r-0.6),'r = 4 cm',fs=8,c=R); f.save()
