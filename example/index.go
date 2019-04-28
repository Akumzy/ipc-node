package main 
import (
	"github.com/Akumzy/ipc"
	"time"
)
func main(){
	io := ipc.New()
	go func (){
		for{
			time.After(20 * time.Second)
			io.Send("get-time-every-20-seconds", time.Now())
		}
	}()
	io.Start()
}