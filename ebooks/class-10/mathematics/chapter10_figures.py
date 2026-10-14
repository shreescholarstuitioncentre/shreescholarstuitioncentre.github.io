import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, numpy as np, math, os
os.makedirs('figs',exist_ok=True)
C='#1a3d7c'; R='#b03030'
class F:
    def __init__(s,name,w=3.3,h=2.8):
        s.name=name; s.fig,s.ax=plt.subplots(figsize=(w,h),dpi=170); s.ax.set_aspect('equal'); s.ax.axis('off')
    def circ(s,c,r,col=C,ls='-'):
        t=np.linspace(0,2*np.pi,200); s.ax.plot(c[0]+r*np.cos(t),c[1]+r*np.sin(t),color=col,lw=1.5,ls=ls)
    def L(s,p,q,col=C,ls='-',lw=1.5): s.ax.plot([p[0],q[0]],[p[1],q[1]],color=col,ls=ls,lw=lw)
    def T(s,p,t,dx=0,dy=0,fs=9,ha='center',c='k'): s.ax.text(p[0]+dx,p[1]+dy,t,fontsize=fs,ha=ha,va='center',color=c)
    def dot(s,p): s.ax.plot([p[0]],[p[1]],'o',color='k',ms=3)
    def ra(s,v,a,b,z=0.25):
        va=np.array(a)-np.array(v); vb=np.array(b)-np.array(v); va=va/np.linalg.norm(va)*z; vb=vb/np.linalg.norm(vb)*z
        pts=[np.array(v)+va,np.array(v)+va+vb,np.array(v)+vb]; s.ax.plot([p[0] for p in pts],[p[1] for p in pts],color='k',lw=0.9)
    def save(s):
        s.fig.savefig('figs/%s.png'%s.name,bbox_inches='tight',pad_inches=0.06); plt.close(s.fig)
def tl(name,r,d,lr,ld,ll):
    f=F(name); O=(0,0);P=(d,0);x=r*r/d;T=(x,math.sqrt(r*r-x*x))
    f.circ(O,r);f.L(O,P,ls='--',col='#777');f.L(O,T);f.L(T,P);f.ra(T,O,P,0.22)
    f.dot(O);f.dot(P);f.dot(T);f.T(O,'O',-0.2*r,-0.2*r);f.T(P,'P',0.15*r,-0.2*r);f.T(T,'T',0,0.2*r)
    f.T(((O[0]+T[0])/2,(O[1]+T[1])/2),lr,-0.22*r,0.05*r,c=R);f.T(((T[0]+P[0])/2,(T[1]+P[1])/2),ll,0.15*r,0.2*r,c=R);f.T((d/2,0),ld,0,-0.2*r,c=R);f.save()
def two(name,r,half,n,lab_p=None,extra=None,chord=False):
    """external point P with two tangents; half = half-angle at P in degrees (so d=r/sin(half))"""
    f=F(name); d=r/math.sin(math.radians(half)); O=(0,0);P=(d,0);x=r*r/d;h=math.sqrt(r*r-x*x);A=(x,h);B=(x,-h)
    f.circ(O,r);f.L(P,A);f.L(P,B);f.L(O,A);f.L(O,B);f.L(O,P,ls='--',col='#777')
    if chord: f.L(A,B,ls=':',col='#777')
    f.ra(A,O,P,0.2);f.ra(B,O,P,0.2)
    for p,t,dx,dy in ((O,n[0],-0.2*r,0),(P,n[1],0.2*r,0),(A,n[2],0.05*r,0.2*r),(B,n[3],0.05*r,-0.2*r)): f.dot(p);f.T(p,t,dx,dy)
    if extra: extra(f,O,P,A,B)
    f.save()
def conc(name,R_,r_,lbl):
    f=F(name);O=(0,0);y=r_;x=math.sqrt(R_**2-r_**2);A=(-x,y);B=(x,y);P=(0,y)
    f.circ(O,R_);f.circ(O,r_,col='#4a8');f.L(A,B);f.L(O,P,ls='--');f.L(O,A,ls=':',col='#777');f.ra(P,O,B,0.2)
    for p,t,dx,dy in ((O,'O',0,-0.35),(A,'A',-0.3,0.15),(B,'B',0.3,0.15),(P,'P',0,0.3)): f.dot(p);f.T(p,t,dx,dy)
    f.T((0.35,r_/2),lbl[0],0,0,c=R,fs=8);f.T((x/2,y+0.35),lbl[1],0,0,c=R,fs=8);f.save()
def perp(name):
    f=F(name);r=1.2;f.circ((0,0),r);f.L((-2,r),(2,r));f.L((0,0),(0,r));f.ra((0,r),(0,0),(1,r),0.2)
    for p,t,dx,dy in (((0,0),'O',0,-0.2),((0,r),'P',0.2,-0.25),((-2,r),'X',0,0.2),((2,r),'Y',0,0.2),((1.0,1.0),'Q',0.2,0.25)): f.T(p,t,dx,dy)
    f.dot((0,0));f.dot((0,r));f.dot((1.0,r+0.0));f.T((1.0,r),'Q',0,0.25);f.L((0,0),(1.0,r),ls='--',col='#777');f.save()
def foot(p,a,b):
    a=np.array(a);b=np.array(b);p=np.array(p);t=np.dot(p-a,b-a)/np.dot(b-a,b-a);return a+t*(b-a)
def circ_quad(name,verts,names,pnames,O=(0,0),r=None):
    f=F(name);V=[np.array(v) for v in verts]
    r=min(np.linalg.norm(foot(O,V[i],V[(i+1)%4])-np.array(O)) for i in range(4)) if r is None else r
    f.circ(O,r)
    for i in range(4):
        f.L(V[i],V[(i+1)%4]);fp=foot(O,V[i],V[(i+1)%4]);f.dot(fp);f.T(fp,pnames[i],*(0.25*(fp-np.array(O))/np.linalg.norm(fp-np.array(O))))
        c=V[i]-np.array(O);f.T(V[i],names[i],*(0.28*c/np.linalg.norm(c)))
    f.dot(O);f.T(O,'O',0,-0.18);f.save()
# ---- scenes ----
tl('tl_5_13',5,13,'5 cm','13 cm','12 cm')
tl('tl_12_13',5,13,'5 cm','OQ = 13 cm','12 cm')
tl('tl_3_5',3,5,'3 cm','5 cm','4 cm')
tl('tl_r',5,13,'r = 5 cm','13 cm','12 cm')
tl('tl_r2',8,17,'r = 8 cm','17 cm','15 cm')
tl('tl_r3',7,25,'r = 7 cm','25 cm','24 cm')
tl('tl_r4',2.5,6.5,'r = 2.5 cm','6.5 cm','6.0 cm')
def ang80(f,O,P,A,B): f.T((P[0]-0.9,0),'80°',0,0,fs=8,c=R); f.T((O[0]+0.7,0),'50°',0,0.15,fs=8,c=R)
two('two80',1.6,40,('O','P','A','B'),extra=ang80)
def ang110(f,O,P,A,B): f.T((O[0]+0.6,0),'110°',0,0.2,fs=8,c=R); f.T((P[0]-0.9,0),'70°',0,0.2,fs=8,c=R)
two('two110',1.6,35,('O','T','M','N'),extra=ang110)
two('two_eq',1.5,32,('O','P','A','B'))
two('two_ptq',1.5,38,('O','T','P','Q'),chord=True)
conc('conc1',7.5,4.5,('4.5','')); conc('conc2',5,3,('3','')); conc('conc3',6,3.5,('r',''))
perp('perp')
circ_quad('rhombus',[(0,2),(3,0),(0,-2),(-3,0)],'ABCD','PQRS')
def vp(ang,d): a=math.radians(ang); return (d*math.cos(a),d*math.sin(a))
circ_quad('quad',[vp(152.5,1/math.cos(math.radians(47.5))),vp(60,1/math.cos(math.radians(45))),vp(-27.5,1/math.cos(math.radians(42.5))),vp(-115,1/math.cos(math.radians(45)))],'ABCD','PQRS')
# incircle triangle
f=F('incircle');A=np.array((0,5.));B=np.array((-3,0.));C_=np.array((3,0.));r=1.699;I=np.array((0,r))
f.circ(I,r);f.L(A,B);f.L(A,C_);f.L(B,C_)
D=foot(I,A,B);Fp=foot(I,A,C_);E=np.array((0,0.))
for p,t,dx,dy in ((A,'A',0,0.3),(B,'B',-0.3,-0.1),(C_,'C',0.3,-0.1),(D,'D',-0.3,0.1),(Fp,'F',0.3,0.1),(E,'E',0,-0.3)): f.dot(p);f.T(p,t,dx,dy)
f.save()
# IB: external point A, OA=7.5, r=4.5, tangent 6
tl('tl_ib',4.5,7.5,'4.5 cm','7.5 cm','6 cm')
# GB b
f=F('chordT');r=5;P=(-4,3);Q=(4,3);T=(0,25/3);O=(0,0)
f.circ(O,r);f.L(P,Q);f.L(P,T);f.L(Q,T);f.L(O,T,ls='--',col='#777');f.L(O,P,ls=':',col='#777');f.L(O,Q,ls=':',col='#777')
for p,t,dx,dy in ((O,'O',0.3,-0.3),(P,'P',-0.35,0.1),(Q,'Q',0.35,0.1),(T,'T',0,0.4),((0,3),'M',0.3,-0.3)): f.dot(p);f.T(p,t,dx,dy)
f.T((0,0),'',0,0);f.save()
# RE construction
f=F('construct');O=(0,0);P=(5,0);M=(2.5,0);x=(16/5);y=math.sqrt(16-x*x);T=(x,y)
f.circ(O,5);f.circ(O,4,col='#4a8');f.circ(M,2.5,col='#c80',ls='--');f.L(O,P);f.L(O,T,ls=':',col='#777');f.L(T,P,col=R,lw=2);f.ra(T,O,P,0.25)
for p,t,dx,dy in ((O,'O',-0.3,-0.2),(P,'P',0.3,-0.2),(M,'M',0,-0.35),(T,'T',0,0.35)): f.dot(p);f.T(p,t,dx,dy)
f.T((4.1,y/2+0.3),'3 cm',0,0,c=R,fs=8);f.save()
